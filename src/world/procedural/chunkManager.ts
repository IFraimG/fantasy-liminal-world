import {
  Group,
  Mesh,
  PlaneGeometry,
  MeshStandardMaterial,
  Scene,
  Vector3,
  Color
} from '@iwsdk/core';
import { ProceduralTextures } from '../textures.js';
import { BuildingGenerator, AnimatedDoor } from './buildingGenerator.js';
import { StreetPropsGenerator } from './streetProps.js';
import { SnowdriftGenerator } from './snowdrifts.js';
import { TerrainElevation } from './terrain.js';
import { BridgeGenerator } from './bridgeGenerator.js';
import { CollisionSystem } from '../collision/collisionSystem.js';

export interface ChunkInfo {
  cx: number;
  cz: number;
  group: Group;
  buildingCount: number;
  lampCount: number;
  doors: AnimatedDoor[];
}

/**
 * High-performance chunk manager:
 * - 3x3 active grid (9 chunks = 192m x 192m)
 * - Continuous 3D undulating terrain (hills, ridges, snow ravines)
 * - Deep anchored building foundations (no floating underside on slopes)
 * - Real multi-story building interiors with staircases and empty rooms
 * - Animated automatic entrance doors that open smoothly on approach
 * - Solid collision registration for walls, garages, and poles
 */
export class ChunkManager {
  public static readonly CHUNK_SIZE = 64; // 64m x 64m per chunk
  public static readonly CHUNK_RADIUS = 1; // 3x3 active grid (9 chunks)

  private scene: Scene;
  private activeChunks = new Map<string, ChunkInfo>();
  private pendingChunks: { cx: number; cz: number }[] = [];
  private activeDoors: AnimatedDoor[] = [];
  private groundMaterial: MeshStandardMaterial | null = null;

  // Statistics for HUD & MCP
  public totalBuildingsGenerated = 0;
  public totalLampsGenerated = 0;
  public currentChunkKey = '0,0';

  constructor(scene: Scene) {
    this.scene = scene;
  }

  private getGroundMaterial(): MeshStandardMaterial {
    if (this.groundMaterial) return this.groundMaterial;

    const texture = ProceduralTextures.getSnowRoadTexture();
    this.groundMaterial = new MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0.05,
      color: new Color('#edf2f7'),
    });
    return this.groundMaterial;
  }

  /**
   * Generates a continuous 3D terrain mesh for chunk (cx, cz) with elevation heights
   * seamlessly sampled from TerrainElevation at exact world vertex positions.
   */
  private createTerrainMeshForChunk(originX: number, originZ: number): Mesh {
    const segments = 24;
    const geo = new PlaneGeometry(ChunkManager.CHUNK_SIZE, ChunkManager.CHUNK_SIZE, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const localX = pos.getX(i);
      const localZ = pos.getZ(i);
      const worldX = originX + localX;
      const worldZ = originZ + localZ;
      const height = TerrainElevation.getHeight(worldX, worldZ);
      pos.setY(i, height);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const mesh = new Mesh(geo, this.getGroundMaterial());
    mesh.receiveShadow = false;
    return mesh;
  }

  private seededRandom(cx: number, cz: number, seedOffset: number = 0): number {
    const n = Math.sin(cx * 12.9898 + cz * 78.233 + seedOffset * 37.719) * 43758.5453;
    return n - Math.floor(n);
  }

  /**
   * Updates chunks around player and animates interactive doors.
   */
  public update(playerPosition: Vector3, delta: number = 0.016): void {
    // 1. Update door animations based on distance to player
    for (const door of this.activeDoors) {
      door.update(playerPosition, delta);
    }

    const curCx = Math.floor((playerPosition.x + ChunkManager.CHUNK_SIZE / 2) / ChunkManager.CHUNK_SIZE);
    const curCz = Math.floor((playerPosition.z + ChunkManager.CHUNK_SIZE / 2) / ChunkManager.CHUNK_SIZE);
    this.currentChunkKey = `${curCx},${curCz}`;

    const neededKeys = new Set<string>();

    for (let dx = -ChunkManager.CHUNK_RADIUS; dx <= ChunkManager.CHUNK_RADIUS; dx++) {
      for (let dz = -ChunkManager.CHUNK_RADIUS; dz <= ChunkManager.CHUNK_RADIUS; dz++) {
        const cx = curCx + dx;
        const cz = curCz + dz;
        const key = `${cx},${cz}`;
        neededKeys.add(key);

        if (!this.activeChunks.has(key) && !this.pendingChunks.some(p => p.cx === cx && p.cz === cz)) {
          this.pendingChunks.push({ cx, cz });
        }
      }
    }

    // Unload distant chunks outside radius and cleanup colliders/doors
    for (const [key, chunk] of this.activeChunks.entries()) {
      if (!neededKeys.has(key)) {
        this.scene.remove(chunk.group);
        for (const child of chunk.group.children) {
          if ((child as Mesh).isMesh && (child as Mesh).geometry) {
            (child as Mesh).geometry.dispose();
          }
        }

        const originX = chunk.cx * ChunkManager.CHUNK_SIZE;
        CollisionSystem.removeCollidersByPrefix(`bld_${originX}_`);
        CollisionSystem.removeCollidersByPrefix(`chunk_${chunk.cx}_${chunk.cz}`);
        this.activeDoors = this.activeDoors.filter(d => !chunk.doors.includes(d));

        this.activeChunks.delete(key);
      }
    }

    // Process at most 1 chunk per frame to avoid micro-stutters
    if (this.pendingChunks.length > 0) {
      const next = this.pendingChunks.shift()!;
      if (neededKeys.has(`${next.cx},${next.cz}`) && !this.activeChunks.has(`${next.cx},${next.cz}`)) {
        this.createChunk(next.cx, next.cz);
      }
    }
  }

  /**
   * Pre-generates initial chunks synchronously during loading screen
   */
  public prewarm(centerPos: Vector3): void {
    const curCx = Math.floor((centerPos.x + ChunkManager.CHUNK_SIZE / 2) / ChunkManager.CHUNK_SIZE);
    const curCz = Math.floor((centerPos.z + ChunkManager.CHUNK_SIZE / 2) / ChunkManager.CHUNK_SIZE);

    for (let dx = -ChunkManager.CHUNK_RADIUS; dx <= ChunkManager.CHUNK_RADIUS; dx++) {
      for (let dz = -ChunkManager.CHUNK_RADIUS; dz <= ChunkManager.CHUNK_RADIUS; dz++) {
        const cx = curCx + dx;
        const cz = curCz + dz;
        const key = `${cx},${cz}`;
        if (!this.activeChunks.has(key)) {
          this.createChunk(cx, cz);
        }
      }
    }
    this.pendingChunks = [];
  }

  private createChunk(cx: number, cz: number): void {
    const group = new Group();
    const originX = cx * ChunkManager.CHUNK_SIZE;
    const originZ = cz * ChunkManager.CHUNK_SIZE;
    group.position.set(originX, 0, originZ);

    // Continuous 3D undulating snow terrain mesh
    const groundMesh = this.createTerrainMeshForChunk(originX, originZ);
    group.add(groundMesh);

    // Height helper for local chunk coordinates
    const getH = (lx: number, lz: number) => TerrainElevation.getHeight(originX + lx, originZ + lz);

    let buildingCount = 0;
    let lampCount = 0;
    const chunkDoors: AnimatedDoor[] = [];

    const variant = Math.floor(this.seededRandom(cx, cz, 1) * 6);
    const r2 = this.seededRandom(cx, cz, 2);
    const r3 = this.seededRandom(cx, cz, 3);
    const r4 = this.seededRandom(cx, cz, 4);

    const isPlayerSpawnChunk = cx === 0 && cz === 0;

    if (!isPlayerSpawnChunk) {
      if (variant === 0) {
        // Variant 0: "Холмы и неровный деревянный мост"
        const bridge = BridgeGenerator.createRicketyBridge(26, 3.8, 3.0);
        const bridgeBaseY = getH(0, 0);
        bridge.position.set(0, bridgeBaseY, 0);
        group.add(bridge);

        const pole1 = StreetPropsGenerator.createTelegraphPole(true);
        pole1.position.set(-6, getH(-6, -18), -18);
        group.add(pole1);
        lampCount++;

        const pole2 = StreetPropsGenerator.createTelegraphPole(false);
        pole2.position.set(6, getH(6, 18), 18);
        pole2.rotation.y = Math.PI;
        group.add(pole2);

        for (const [px, pz] of [[-16, -10], [-20, 12], [18, -8], [22, 14]]) {
          const pine = StreetPropsGenerator.createTallPineTree(14 + r2 * 6);
          pine.position.set(px, getH(px, pz), pz);
          group.add(pine);
        }

        const drift = SnowdriftGenerator.createConformalSnowMound(originX + 12, originZ, 18, 3.2, 1.2);
        drift.position.set(12, 0, 0);
        group.add(drift);

      } else if (variant === 1) {
        // Variant 1: "Глухая зимняя тайга"
        const pineCoords = [
          [-22, -22], [-8, -24], [10, -20], [24, -18],
          [-20, -6], [-5, -4], [16, -5],
          [-18, 14], [-4, 18], [12, 16], [22, 22],
          [-10, 8], [8, 6], [20, 4]
        ];

        for (let i = 0; i < pineCoords.length; i++) {
          const [px, pz] = pineCoords[i];
          const treeH = 13 + ((i * 3.7 + r2 * 5) % 8);
          const pine = StreetPropsGenerator.createTallPineTree(treeH);
          pine.position.set(px, getH(px, pz), pz);
          pine.rotation.y = i * 1.3;
          group.add(pine);
        }

        const pole = StreetPropsGenerator.createTelegraphPole(true);
        pole.position.set(2, getH(2, -2), -2);
        group.add(pole);
        lampCount++;

        const cross = StreetPropsGenerator.createNorthernCross(1.2);
        cross.position.set(-12, getH(-12, 4), 4);
        group.add(cross);

        const drift1 = SnowdriftGenerator.createConformalSnowMound(originX - 8, originZ - 12, 22, 3.5, 1.4);
        drift1.position.set(-8, 0, -12);
        group.add(drift1);

      } else if (variant === 2) {
        // Variant 2: "Зимняя дорога и линия ЛЭП"
        const poleZ = [-22, 0, 22];
        for (let i = 0; i < poleZ.length; i++) {
          const pz = poleZ[i];
          const hasLamp = i === 1;
          const pole = StreetPropsGenerator.createTelegraphPole(hasLamp);
          const py = getH(-8, pz);
          pole.position.set(-8, py, pz);
          group.add(pole);
          if (hasLamp) lampCount++;

          CollisionSystem.addCollider({
            minX: originX - 8 - 0.35,
            maxX: originX - 8 + 0.35,
            minZ: originZ + pz - 0.35,
            maxZ: originZ + pz + 0.35,
            id: `chunk_${cx}_${cz}_pole_${i}`
          });
        }

        const roadDriftL = SnowdriftGenerator.createConformalSnowMound(originX - 14, originZ, 36, 2.6, 0.9);
        roadDriftL.position.set(-14, 0, 0);
        group.add(roadDriftL);

        const roadDriftR = SnowdriftGenerator.createConformalSnowMound(originX + 14, originZ, 36, 2.6, 0.9);
        roadDriftR.position.set(14, 0, 0);
        group.add(roadDriftR);

        for (const [px, pz] of [[18, -20], [22, 2], [16, 22], [-22, -14], [-24, 16]]) {
          const pine = StreetPropsGenerator.createTallPineTree(15 + r3 * 4);
          pine.position.set(px, getH(px, pz), pz);
          group.add(pine);
        }

        if (r4 > 0.4) {
          const garage = StreetPropsGenerator.createGarage();
          const gy = getH(14, -8);
          garage.position.set(14, gy, -8);
          garage.rotation.y = -Math.PI / 2;
          group.add(garage);

          CollisionSystem.addCollider({
            minX: originX + 14 - 3.2,
            maxX: originX + 14 + 3.2,
            minZ: originZ - 8 - 2.8,
            maxZ: originZ - 8 + 2.8,
            id: `chunk_${cx}_${cz}_garage`
          });
        }

      } else if (variant === 3) {
        // Variant 3: "Заброшенная галерея / надземный переход"
        const galleryLength = 40;
        const gallery = BridgeGenerator.createAbandonedGallery(galleryLength, 4.2, 3.5);
        gallery.position.set(0, getH(0, 0), 0);
        group.add(gallery);

        const lamp = StreetPropsGenerator.createStreetLamp(true);
        lamp.position.set(-8, getH(-8, 22), 22);
        group.add(lamp);
        lampCount++;

        for (const [px, pz] of [[-18, -14], [-16, 16], [16, -18], [18, 12]]) {
          const pine = StreetPropsGenerator.createTallPineTree(14);
          pine.position.set(px, getH(px, pz), pz);
          group.add(pine);
        }

        const drift = SnowdriftGenerator.createConformalSnowMound(originX + 10, originZ - 10, 16, 2.8, 1.2);
        drift.position.set(10, 0, -10);
        group.add(drift);

      } else if (variant === 4) {
        // Variant 4: "Северное урочище / погост на сопке"
        const crossPositions = [
          [0, 0, 1.3],
          [-5, 4, 1.1],
          [6, 3, 1.0],
          [-8, -5, 0.9],
          [4, -6, 1.2],
          [-2, 10, 0.8],
          [7, 11, 1.0]
        ];

        for (const [cxPos, czPos, scale] of crossPositions) {
          const cross = StreetPropsGenerator.createNorthernCross(scale);
          cross.position.set(cxPos, getH(cxPos, czPos), czPos);
          cross.rotation.y = Math.sin(cxPos * 2 + czPos) * 0.2;
          cross.rotation.z = Math.cos(cxPos + czPos * 3) * 0.05;
          group.add(cross);
        }

        for (const [px, pz] of [[-20, -18], [-22, 16], [22, -14], [20, 20], [0, -22]]) {
          const pine = StreetPropsGenerator.createTallPineTree(15 + r2 * 4);
          pine.position.set(px, getH(px, pz), pz);
          group.add(pine);
        }

        const pole = StreetPropsGenerator.createTelegraphPole(true);
        pole.position.set(16, getH(16, 0), 0);
        group.add(pole);
        lampCount++;

      } else {
        // Variant 5: "Спальный массив на сопках" (Multi-story building with real interior & deep foundation)
        const b1Floors = 4 + Math.floor(r2 * 2);
        const bz = -ChunkManager.CHUNK_SIZE * 0.28;
        const by = getH(0, bz);

        const b1Result = BuildingGenerator.createBuilding(
          { floors: b1Floors, width: 34, depth: 12 },
          originX,
          by,
          originZ + bz
        );
        b1Result.group.position.set(0, by, bz);
        group.add(b1Result.group);
        buildingCount++;
        chunkDoors.push(...b1Result.doors);
        CollisionSystem.addColliders(b1Result.colliders);
        CollisionSystem.addInterior(b1Result.interior);

        const lamp1 = StreetPropsGenerator.createStreetLamp(true);
        lamp1.position.set(-12, getH(-12, 6), 6);
        group.add(lamp1);
        lampCount++;

        const lamp2 = StreetPropsGenerator.createStreetLamp(false);
        lamp2.position.set(12, getH(12, 6), 6);
        lamp2.rotation.y = Math.PI;
        group.add(lamp2);
        lampCount++;

        const tree = StreetPropsGenerator.createWinterTree();
        tree.position.set(-18, getH(-18, -4), -4);
        group.add(tree);

        const pine = StreetPropsGenerator.createTallPineTree(16);
        pine.position.set(20, getH(20, -10), -10);
        group.add(pine);

        if (r4 > 0.4) {
          const garage = StreetPropsGenerator.createGarage();
          const gy = getH(-18, 18);
          garage.position.set(-18, gy, 18);
          garage.rotation.y = Math.PI / 2;
          group.add(garage);

          CollisionSystem.addCollider({
            minX: originX - 18 - 3.2,
            maxX: originX - 18 + 3.2,
            minZ: originZ + 18 - 2.8,
            maxZ: originZ + 18 + 2.8,
            id: `chunk_${cx}_${cz}_garage`
          });
        }
      }
    } else {
      // Spawn courtyard: residential block with openable door, staircases, and rooms
      const lamp = StreetPropsGenerator.createStreetLamp(true);
      lamp.position.set(6, getH(6, 8), 8);
      group.add(lamp);
      lampCount++;

      const bz = -26;
      const by = getH(0, bz);
      const spawnBuildingResult = BuildingGenerator.createBuilding(
        { floors: 4, width: 42, depth: 12 },
        originX,
        by,
        originZ + bz
      );
      spawnBuildingResult.group.position.set(0, by, bz);
      group.add(spawnBuildingResult.group);
      buildingCount++;
      chunkDoors.push(...spawnBuildingResult.doors);
      CollisionSystem.addColliders(spawnBuildingResult.colliders);
      CollisionSystem.addInterior(spawnBuildingResult.interior);

      const tree = StreetPropsGenerator.createWinterTree();
      tree.position.set(-12, getH(-12, 6), 6);
      group.add(tree);

      const tallPine = StreetPropsGenerator.createTallPineTree(15);
      tallPine.position.set(18, getH(18, -14), -14);
      group.add(tallPine);

      const telegraph = StreetPropsGenerator.createTelegraphPole(false);
      telegraph.position.set(-18, getH(-18, -10), -10);
      group.add(telegraph);

      const spawnDrift = SnowdriftGenerator.createConformalSnowMound(originX + 10, originZ + 12, 16, 4, 1.0);
      spawnDrift.position.set(10, 0, 12);
      group.add(spawnDrift);
    }

    this.scene.add(group);
    this.totalBuildingsGenerated += buildingCount;
    this.totalLampsGenerated += lampCount;
    this.activeDoors.push(...chunkDoors);

    this.activeChunks.set(`${cx},${cz}`, {
      cx,
      cz,
      group,
      buildingCount,
      lampCount,
      doors: chunkDoors
    });
  }

  public getActiveChunkCount(): number {
    return this.activeChunks.size;
  }

  public getActiveChunks(): ChunkInfo[] {
    return Array.from(this.activeChunks.values());
  }
}
