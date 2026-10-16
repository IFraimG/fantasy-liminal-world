import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Group,
  Color
} from '@iwsdk/core';
import { ProceduralTextures } from '../textures.js';
import { SnowdriftGenerator } from './snowdrifts.js';

export interface BuildingOptions {
  floors?: number;
  width?: number; // meters along X
  depth?: number; // meters along Z
  isLShaped?: boolean;
}

/**
 * Procedural generator for authentic Soviet panel apartment buildings (хрущевки / панельки).
 * Optimized for high performance and zero light-overflow.
 */
export class BuildingGenerator {
  private static facadeMaterial: MeshStandardMaterial | null = null;
  private static snowRoofMaterial: MeshStandardMaterial | null = null;
  private static foundationMaterial: MeshStandardMaterial | null = null;
  private static metalDoorMaterial: MeshStandardMaterial | null = null;
  private static porchBulbMaterial: MeshBasicMaterial | null = null;

  // Shared geometry cache
  private static canopyGeo: BoxGeometry | null = null;
  private static canopySnowGeo: BoxGeometry | null = null;
  private static doorGeo: BoxGeometry | null = null;
  private static porchBulbGeo: BoxGeometry | null = null;
  private static ventGeo: BoxGeometry | null = null;
  private static ventSnowGeo: BoxGeometry | null = null;

  public static getFacadeMaterial(): MeshStandardMaterial {
    if (this.facadeMaterial) return this.facadeMaterial;

    const texture = ProceduralTextures.getBuildingFacadeTexture();
    this.facadeMaterial = new MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.1,
    });
    return this.facadeMaterial;
  }

  public static getSnowRoofMaterial(): MeshStandardMaterial {
    if (this.snowRoofMaterial) return this.snowRoofMaterial;

    this.snowRoofMaterial = new MeshStandardMaterial({
      color: new Color('#eef3f9'),
      roughness: 0.95,
      metalness: 0.05,
    });
    return this.snowRoofMaterial;
  }

  public static getFoundationMaterial(): MeshStandardMaterial {
    if (this.foundationMaterial) return this.foundationMaterial;

    this.foundationMaterial = new MeshStandardMaterial({
      color: new Color('#4a4e54'),
      roughness: 0.9,
      metalness: 0.1,
    });
    return this.foundationMaterial;
  }

  public static getMetalDoorMaterial(): MeshStandardMaterial {
    if (this.metalDoorMaterial) return this.metalDoorMaterial;

    this.metalDoorMaterial = new MeshStandardMaterial({
      color: new Color('#2c3036'),
      roughness: 0.7,
      metalness: 0.4,
    });
    return this.metalDoorMaterial;
  }

  public static getPorchBulbMaterial(): MeshBasicMaterial {
    if (this.porchBulbMaterial) return this.porchBulbMaterial;

    this.porchBulbMaterial = new MeshBasicMaterial({
      color: new Color('#ffaa44'),
    });
    return this.porchBulbMaterial;
  }

  /**
   * Generates a complete panel building with foundation, entrances, roof snow, and snowdrifts.
   */
  public static createBuilding(options: BuildingOptions = {}): Group {
    const group = new Group();
    const floors = options.floors ?? (Math.random() > 0.4 ? 4 : (Math.random() > 0.5 ? 5 : 3));
    const floorHeight = 2.8;
    const totalHeight = floors * floorHeight;
    const width = options.width ?? (32 + Math.floor(Math.random() * 2) * 10);
    const depth = options.depth ?? 12;

    // 1. Main building block
    const mainGeo = new BoxGeometry(width, totalHeight, depth);
    const mainMesh = new Mesh(mainGeo, this.getFacadeMaterial());
    mainMesh.position.y = totalHeight / 2;
    group.add(mainMesh);

    // 2. Foundation band
    const foundHeight = 0.8;
    const foundGeo = new BoxGeometry(width + 0.2, foundHeight, depth + 0.2);
    const foundMesh = new Mesh(foundGeo, this.getFoundationMaterial());
    foundMesh.position.y = foundHeight / 2;
    group.add(foundMesh);

    // 3. Roof snow cap
    const roofSnowThickness = 0.35;
    const roofGeo = new BoxGeometry(width + 0.4, roofSnowThickness, depth + 0.4);
    const roofMesh = new Mesh(roofGeo, this.getSnowRoofMaterial());
    roofMesh.position.y = totalHeight + roofSnowThickness / 2;
    group.add(roofMesh);

    // Roof ventilation structures
    if (!this.ventGeo) this.ventGeo = new BoxGeometry(3, 1.8, 3.5);
    if (!this.ventSnowGeo) this.ventSnowGeo = new BoxGeometry(3.3, 0.25, 3.8);

    const ventsCount = Math.max(1, Math.floor(width / 18));
    for (let v = 0; v < ventsCount; v++) {
      const vx = -width * 0.3 + v * (width * 0.6 / Math.max(1, ventsCount - 1));
      const ventMesh = new Mesh(this.ventGeo, this.getFacadeMaterial());
      ventMesh.position.set(vx, totalHeight + 0.9, 0);
      group.add(ventMesh);

      const ventSnow = new Mesh(this.ventSnowGeo, this.getSnowRoofMaterial());
      ventSnow.position.set(vx, totalHeight + 1.8 + 0.12, 0);
      group.add(ventSnow);
    }

    // 4. Entrances (подъезды с козырьками и светящимися лампами)
    if (!this.canopyGeo) this.canopyGeo = new BoxGeometry(3.0, 0.2, 1.8);
    if (!this.canopySnowGeo) this.canopySnowGeo = new BoxGeometry(3.1, 0.22, 1.9);
    if (!this.doorGeo) this.doorGeo = new BoxGeometry(1.5, 2.1, 0.1);
    if (!this.porchBulbGeo) this.porchBulbGeo = new BoxGeometry(0.3, 0.15, 0.2);

    const entranceCount = Math.max(1, Math.floor(width / 16));
    for (let e = 0; e < entranceCount; e++) {
      const ex = -width * 0.3 + e * (width * 0.6 / Math.max(1, entranceCount - 1));
      const ez = depth / 2;

      const canopy = new Mesh(this.canopyGeo, this.getFoundationMaterial());
      canopy.position.set(ex, 2.4, ez + 0.9);
      group.add(canopy);

      const canopySnow = new Mesh(this.canopySnowGeo, this.getSnowRoofMaterial());
      canopySnow.position.set(ex, 2.52, ez + 0.9);
      group.add(canopySnow);

      const door = new Mesh(this.doorGeo, this.getMetalDoorMaterial());
      door.position.set(ex, 1.05, ez + 0.05);
      group.add(door);

      // Emissive porch light (zero light source cost!)
      const porchBulb = new Mesh(this.porchBulbGeo, this.getPorchBulbMaterial());
      porchBulb.position.set(ex, 2.2, ez + 0.8);
      group.add(porchBulb);
    }

    // 5. Snowbanks along walls
    const frontSnowbank = SnowdriftGenerator.createSnowMound(width * 1.01, 2.8, 0.9);
    frontSnowbank.position.set(0, 0, depth / 2 + 1.1);
    group.add(frontSnowbank);

    const backSnowbank = SnowdriftGenerator.createSnowMound(width * 1.01, 2.8, 0.9);
    backSnowbank.position.set(0, 0, -depth / 2 - 1.1);
    backSnowbank.rotation.y = Math.PI;
    group.add(backSnowbank);

    // Optional L-shaped wing
    if (options.isLShaped) {
      const wingLength = 22;
      const wingGeo = new BoxGeometry(depth, totalHeight, wingLength);
      const wingMesh = new Mesh(wingGeo, this.getFacadeMaterial());
      wingMesh.position.set(width / 2 - depth / 2, totalHeight / 2, wingLength / 2 + depth / 2);
      group.add(wingMesh);

      const wingRoof = new Mesh(new BoxGeometry(depth + 0.4, roofSnowThickness, wingLength + 0.4), this.getSnowRoofMaterial());
      wingRoof.position.set(width / 2 - depth / 2, totalHeight + roofSnowThickness / 2, wingLength / 2 + depth / 2);
      group.add(wingRoof);
    }

    return group;
  }
}
