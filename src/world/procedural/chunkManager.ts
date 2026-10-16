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
import { BuildingGenerator } from './buildingGenerator.js';
import { StreetPropsGenerator } from './streetProps.js';
import { SnowdriftGenerator } from './snowdrifts.js';
import { TerrainElevation } from './terrain.js';
import { BridgeGenerator } from './bridgeGenerator.js';

export interface ChunkInfo {
  cx: number;
  cz: number;
  group: Group;
  buildingCount: number;
  lampCount: number;
}

/**
 * High-performance chunk manager:
 * - 3x3 active grid (9 chunks = 192m x 192m)
 * - Continuous 3D undulating terrain (hills, ridges, snow ravines) seamlessly aligned across chunk boundaries
 * - 6 distinct procedural atmosphere variants inspired by northern liminal winter landscapes:
 *   1. Hills & rickety wooden bridge spanning a ravine
 *   2. Dense foggy pine taiga forest
 *   3. Country road with wooden telegraph utility poles (ЛЭП) and glowing sodium lamps
 *   4. Abandoned elevated concrete gallery / corridor with blown-in snow
 *   5. Northern hillside memorial with weathered wooden crosses
 *   6. Multi-elevation panel buildings (хрущевки на сопках)
 */
export class ChunkManager {
  public static readonly CHUNK_SIZE = 64; // 64m x 64m per chunk
  public static readonly CHUNK_RADIUS = 1; // 3x3 active grid (9 chunks)

  private scene: Scene;
  private activeChunks = new Map<string, ChunkInfo>();
  private pendingChunks: { cx: number; cz: number }[] = [];
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
   * Updates chunks around player. Enqueues new chunks for non-blocking creation.
   */
  public update(playerPosition: Vector3): void {
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

    // Unload distant chunks outside radius
    for (const [key, chunk] of this.activeChunks.entries()) {
      if (!neededKeys.has(key)) {
        this.scene.remove(chunk.group);
        for (const child of chunk.group.children) {
          if ((child as Mesh).isMesh && (child as Mesh).geometry) {
            (child as Mesh).geometry.dispose();
          }
        }
        this.activeChunks.delete(key);
      }
    }

    // Process at most 1 chunk per frame to avoid any micro-stutters
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

    const variant = Math.floor(this.seededRandom(cx, cz, 1) * 6);
    const r2 = this.seededRandom(cx, cz, 2);
    const r3 = this.seededRandom(cx, cz, 3);
    const r4 = this.seededRandom(cx, cz, 4);

    const isPlayerSpawnChunk = cx === 0 && cz === 0;

    if (!isPlayerSpawnChunk) {
      if (variant === 0) {
        // Variant 0: "Холмы и неровный деревянный мост" (Rickety bridge spanning a snow dip/ravine)
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

        const drift = SnowdriftGenerator.createSnowMound(18, 3.2, 1.2);
        drift.position.set(12, getH(12, 0), 0);
        group.add(drift);

      } else if (variant === 1) {
        // Variant 1: "Глухая зимняя тайга" (Dense Taiga Pine Forest, Reference Image 2)
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

        const drift1 = SnowdriftGenerator.createSnowMound(22, 3.5, 1.4);
        drift1.position.set(-8, getH(-8, -12), -12);
        group.add(drift1);

      } else if (variant === 2) {
        // Variant 2: "Зимняя дорога и линия ЛЭП" (Snow Road with Telegraph Poles, Reference Image 4)
        const poleZ = [-22, 0, 22];
        for (let i = 0; i < poleZ.length; i++) {
          const pz = poleZ[i];
          const hasLamp = i === 1;
          const pole = StreetPropsGenerator.createTelegraphPole(hasLamp);
          pole.position.set(-8, getH(-8, pz), pz);
          group.add(pole);
          if (hasLamp) lampCount++;
        }

        const roadDriftL = SnowdriftGenerator.createSnowMound(44, 2.4, 0.8);
        roadDriftL.position.set(-14, getH(-14, 0), 0);
        group.add(roadDriftL);

        const roadDriftR = SnowdriftGenerator.createSnowMound(44, 2.2, 0.8);
        roadDriftR.position.set(14, getH(14, 0), 0);
        group.add(roadDriftR);

        for (const [px, pz] of [[18, -20], [22, 2], [16, 22], [-22, -14], [-24, 16]]) {
          const pine = StreetPropsGenerator.createTallPineTree(15 + r3 * 4);
          pine.position.set(px, getH(px, pz), pz);
          group.add(pine);
        }

        if (r4 > 0.4) {
          const garage = StreetPropsGenerator.createGarage();
          garage.position.set(14, getH(14, -8), -8);
          garage.rotation.y = -Math.PI / 2;
          group.add(garage);
        }

      } else if (variant === 3) {
        // Variant 3: "Заброшенная галерея / надземный переход" (Abandoned Concrete Corridor, Reference Image 1)
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

        const drift = SnowdriftGenerator.createSnowMound(16, 2.8, 1.2);
        drift.position.set(10, getH(10, -10), -10);
        group.add(drift);

      } else if (variant === 4) {
        // Variant 4: "Северное урочище / погост на сопке" (Northern Memorial on High Hill, Reference Image 5)
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
        // Variant 5: "Спальный массив на сопках" (Multi-Elevation Residential Blocks, Reference Image 3)
        const b1Floors = 4 + Math.floor(r2 * 2);
        const b1 = BuildingGenerator.createBuilding({ floors: b1Floors, width: 34, depth: 12 });
        b1.position.set(0, getH(0, -ChunkManager.CHUNK_SIZE * 0.28), -ChunkManager.CHUNK_SIZE * 0.28);
        group.add(b1);
        buildingCount++;

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
          garage.position.set(-18, getH(-18, 18), 18);
          garage.rotation.y = Math.PI / 2;
          group.add(garage);
        }
      }
    } else {
      // Spawn courtyard
      const lamp = StreetPropsGenerator.createStreetLamp(true);
      lamp.position.set(6, getH(6, 8), 8);
      group.add(lamp);
      lampCount++;

      const northBuilding = BuildingGenerator.createBuilding({ floors: 4, width: 42, depth: 12 });
      northBuilding.position.set(0, getH(0, -26), -26);
      group.add(northBuilding);
      buildingCount++;

      const tree = StreetPropsGenerator.createWinterTree();
      tree.position.set(-12, getH(-12, 6), 6);
      group.add(tree);

      const tallPine = StreetPropsGenerator.createTallPineTree(15);
      tallPine.position.set(18, getH(18, -14), -14);
      group.add(tallPine);

      const telegraph = StreetPropsGenerator.createTelegraphPole(false);
      telegraph.position.set(-18, getH(-18, -10), -10);
      group.add(telegraph);

      const spawnDrift = SnowdriftGenerator.createSnowMound(16, 4, 1.0);
      spawnDrift.position.set(10, getH(10, 12), 12);
      group.add(spawnDrift);
    }

    this.scene.add(group);
    this.totalBuildingsGenerated += buildingCount;
    this.totalLampsGenerated += lampCount;

    this.activeChunks.set(`${cx},${cz}`, {
      cx,
      cz,
      group,
      buildingCount,
      lampCount
    });
  }

  public getActiveChunkCount(): number {
    return this.activeChunks.size;
  }

  public getActiveChunks(): ChunkInfo[] {
    return Array.from(this.activeChunks.values());
  }
}
