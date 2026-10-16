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

export interface ChunkInfo {
  cx: number;
  cz: number;
  group: Group;
  buildingCount: number;
  lampCount: number;
}

/**
 * High-performance chunk manager:
 * - 3x3 active grid (9 chunks = 192m x 192m), perfectly tuned with night fog
 * - Time-sliced non-blocking chunk creation
 * - Light pooling for high 60 FPS
 */
export class ChunkManager {
  public static readonly CHUNK_SIZE = 64; // 64m x 64m per chunk
  public static readonly CHUNK_RADIUS = 1; // 3x3 active grid (9 chunks)

  private scene: Scene;
  private activeChunks = new Map<string, ChunkInfo>();
  private pendingChunks: { cx: number; cz: number }[] = [];
  private groundMaterial: MeshStandardMaterial | null = null;
  private groundGeo: PlaneGeometry | null = null;

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

  private getGroundGeometry(): PlaneGeometry {
    if (this.groundGeo) return this.groundGeo;
    this.groundGeo = new PlaneGeometry(ChunkManager.CHUNK_SIZE, ChunkManager.CHUNK_SIZE, 2, 2);
    this.groundGeo.rotateX(-Math.PI / 2);
    return this.groundGeo;
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

    // Ground plane
    const groundMesh = new Mesh(this.getGroundGeometry(), this.getGroundMaterial());
    group.add(groundMesh);

    let buildingCount = 0;
    let lampCount = 0;

    const variant = Math.floor(this.seededRandom(cx, cz, 1) * 3);
    const r2 = this.seededRandom(cx, cz, 2);
    const r3 = this.seededRandom(cx, cz, 3);
    const r4 = this.seededRandom(cx, cz, 4);

    const isPlayerSpawnChunk = cx === 0 && cz === 0;

    if (!isPlayerSpawnChunk) {
      if (variant === 0 || variant === 1) {
        // Courtyard layout
        const bFloors = 3 + Math.floor(r2 * 3);
        const bWidth = 34 + Math.floor(r3 * 2) * 10;
        const building = BuildingGenerator.createBuilding({
          floors: bFloors,
          width: bWidth,
          depth: 12,
          isLShaped: r4 > 0.7
        });
        building.position.set(0, 0, -ChunkManager.CHUNK_SIZE * 0.28);
        group.add(building);
        buildingCount++;

        // Street lamps (only 1 active pointlight per chunk)
        const lamp1 = StreetPropsGenerator.createStreetLamp(true);
        lamp1.position.set(-14, 0, 10);
        group.add(lamp1);

        const lamp2 = StreetPropsGenerator.createStreetLamp(false);
        lamp2.position.set(14, 0, 10);
        lamp2.rotation.y = Math.PI;
        group.add(lamp2);
        lampCount += 2;

        const tree = StreetPropsGenerator.createWinterTree();
        tree.position.set(-18, 0, -4);
        group.add(tree);

        if (r4 > 0.5) {
          const garage = StreetPropsGenerator.createGarage();
          garage.position.set(-20, 0, 18);
          garage.rotation.y = Math.PI / 2;
          group.add(garage);
        }
      } else {
        // Two facing residential blocks
        const b1 = BuildingGenerator.createBuilding({ floors: 4, width: 34, depth: 11 });
        b1.position.set(0, 0, -ChunkManager.CHUNK_SIZE * 0.32);
        group.add(b1);
        buildingCount++;

        const b2 = BuildingGenerator.createBuilding({ floors: 5, width: 34, depth: 11 });
        b2.position.set(0, 0, ChunkManager.CHUNK_SIZE * 0.32);
        b2.rotation.y = Math.PI;
        group.add(b2);
        buildingCount++;

        const lamp = StreetPropsGenerator.createStreetLamp(true);
        lamp.position.set(0, 0, 0);
        group.add(lamp);
        lampCount++;

        const drift = SnowdriftGenerator.createSnowMound(ChunkManager.CHUNK_SIZE * 0.8, 2.5, 1.0);
        drift.position.set(0, 0, 10);
        group.add(drift);
      }
    } else {
      // Spawn courtyard
      const lamp = StreetPropsGenerator.createStreetLamp(true);
      lamp.position.set(6, 0, 8);
      group.add(lamp);
      lampCount++;

      const northBuilding = BuildingGenerator.createBuilding({ floors: 4, width: 42, depth: 12 });
      northBuilding.position.set(0, 0, -26);
      group.add(northBuilding);
      buildingCount++;

      const tree = StreetPropsGenerator.createWinterTree();
      tree.position.set(-12, 0, 6);
      group.add(tree);

      const spawnDrift = SnowdriftGenerator.createSnowMound(16, 4, 1.0);
      spawnDrift.position.set(10, 0, 12);
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
