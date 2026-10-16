import {
  CylinderGeometry,
  BoxGeometry,
  PlaneGeometry,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Group,
  Color,
  PointLight,
  CanvasTexture
} from '@iwsdk/core';
import { SnowdriftGenerator } from './snowdrifts.js';

/**
 * Highly optimized street elements:
 * - Shared static geometries to minimize allocation & memory
 * - Emissive glowing lanterns with faux ground light pool textures (zero dynamic light cost)
 * - Only key active lights
 */
export class StreetPropsGenerator {
  private static poleMaterial: MeshStandardMaterial | null = null;
  private static lampBulbMaterial: MeshBasicMaterial | null = null;
  private static treeMaterial: MeshStandardMaterial | null = null;
  private static garageMaterial: MeshStandardMaterial | null = null;
  private static lightPoolTexture: CanvasTexture | null = null;
  private static lightPoolMaterial: MeshBasicMaterial | null = null;

  // Shared geometry cache
  private static poleGeo: CylinderGeometry | null = null;
  private static armGeo: CylinderGeometry | null = null;
  private static fixtureGeo: BoxGeometry | null = null;
  private static bulbGeo: BoxGeometry | null = null;
  private static garageGeo: BoxGeometry | null = null;
  private static garageSnowGeo: BoxGeometry | null = null;
  private static lightPoolGeo: PlaneGeometry | null = null;

  public static getPoleMaterial(): MeshStandardMaterial {
    if (this.poleMaterial) return this.poleMaterial;
    this.poleMaterial = new MeshStandardMaterial({
      color: new Color('#52575c'),
      roughness: 0.8,
      metalness: 0.2,
    });
    return this.poleMaterial;
  }

  public static getLampBulbMaterial(): MeshBasicMaterial {
    if (this.lampBulbMaterial) return this.lampBulbMaterial;
    this.lampBulbMaterial = new MeshBasicMaterial({
      color: new Color('#ffc46a'),
    });
    return this.lampBulbMaterial;
  }

  public static getTreeMaterial(): MeshStandardMaterial {
    if (this.treeMaterial) return this.treeMaterial;
    this.treeMaterial = new MeshStandardMaterial({
      color: new Color('#2c2725'),
      roughness: 0.9,
    });
    return this.treeMaterial;
  }

  public static getGarageMaterial(): MeshStandardMaterial {
    if (this.garageMaterial) return this.garageMaterial;
    this.garageMaterial = new MeshStandardMaterial({
      color: new Color('#5c6168'),
      roughness: 0.85,
      metalness: 0.3,
    });
    return this.garageMaterial;
  }

  private static getLightPoolMaterial(): MeshBasicMaterial {
    if (this.lightPoolMaterial) return this.lightPoolMaterial;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255, 180, 80, 0.45)');
    grad.addColorStop(0.4, 'rgba(255, 160, 60, 0.25)');
    grad.addColorStop(0.8, 'rgba(240, 140, 40, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    this.lightPoolTexture = new CanvasTexture(canvas);
    this.lightPoolMaterial = new MeshBasicMaterial({
      map: this.lightPoolTexture,
      transparent: true,
      depthWrite: false,
    });
    return this.lightPoolMaterial;
  }

  /**
   * Authentic Soviet courtyard street lamp (фонарный столб)
   * Uses faux light pool + optional lightweight point light
   */
  public static createStreetLamp(hasActiveLight: boolean = false): Group {
    const group = new Group();
    const height = 6.5;

    // Reuse geometries
    if (!this.poleGeo) this.poleGeo = new CylinderGeometry(0.12, 0.16, height, 7);
    const poleMesh = new Mesh(this.poleGeo, this.getPoleMaterial());
    poleMesh.position.y = height / 2;
    group.add(poleMesh);

    // Snow pile around pole base
    const baseSnow = SnowdriftGenerator.createSnowMound(1.6, 1.6, 0.35);
    baseSnow.position.y = 0;
    group.add(baseSnow);

    // Curved bracket arm holding the lantern
    if (!this.armGeo) {
      this.armGeo = new CylinderGeometry(0.06, 0.06, 1.4, 6);
      this.armGeo.rotateZ(Math.PI / 3);
    }
    const armMesh = new Mesh(this.armGeo, this.getPoleMaterial());
    armMesh.position.set(0.6, height - 0.2, 0);
    group.add(armMesh);

    // Lamp housing
    if (!this.fixtureGeo) this.fixtureGeo = new BoxGeometry(0.7, 0.25, 0.4);
    const fixtureMesh = new Mesh(this.fixtureGeo, this.getPoleMaterial());
    fixtureMesh.position.set(1.2, height + 0.35, 0);
    group.add(fixtureMesh);

    // Glowing emitter bulb
    if (!this.bulbGeo) this.bulbGeo = new BoxGeometry(0.5, 0.1, 0.3);
    const bulbMesh = new Mesh(this.bulbGeo, this.getLampBulbMaterial());
    bulbMesh.position.set(1.2, height + 0.23, 0);
    group.add(bulbMesh);

    // Faux light pool on the ground (warm amber pool on the snow)
    if (!this.lightPoolGeo) {
      this.lightPoolGeo = new PlaneGeometry(14, 14);
      this.lightPoolGeo.rotateX(-Math.PI / 2);
    }
    const poolMesh = new Mesh(this.lightPoolGeo, this.getLightPoolMaterial());
    poolMesh.position.set(1.2, 0.02, 0);
    group.add(poolMesh);

    // Add dynamic PointLight only if explicitly requested (e.g. at spawn or key intersections)
    if (hasActiveLight) {
      const light = new PointLight(0xffa238, 2.0, 20, 1.2);
      light.position.set(1.2, height + 0.15, 0);
      group.add(light);
    }

    return group;
  }

  /**
   * Bare winter tree with snow on branches
   */
  public static createWinterTree(): Group {
    const group = new Group();
    const trunkHeight = 5.0;

    const trunkGeo = new CylinderGeometry(0.18, 0.26, trunkHeight, 6);
    const trunkMesh = new Mesh(trunkGeo, this.getTreeMaterial());
    trunkMesh.position.y = trunkHeight / 2;
    group.add(trunkMesh);

    // Optimized branch count (4 branches instead of 10)
    for (let i = 0; i < 4; i++) {
      const bLen = 2.2;
      const bGeo = new CylinderGeometry(0.05, 0.09, bLen, 4);
      const bMesh = new Mesh(bGeo, this.getTreeMaterial());
      
      const angle = (i / 4) * Math.PI * 2;
      const bY = trunkHeight * 0.45 + (i * 0.6);
      
      bMesh.position.set(0, bY, 0);
      bMesh.rotation.z = Math.PI / 4;
      bMesh.rotation.y = angle;
      group.add(bMesh);
    }

    const treeSnow = SnowdriftGenerator.createSnowMound(2.0, 2.0, 0.4);
    treeSnow.position.y = 0;
    group.add(treeSnow);

    return group;
  }

  /**
   * Typical metal courtyard garage
   */
  public static createGarage(): Group {
    const group = new Group();
    if (!this.garageGeo) this.garageGeo = new BoxGeometry(3.2, 2.2, 5.5);
    const gMesh = new Mesh(this.garageGeo, this.getGarageMaterial());
    gMesh.position.y = 1.1;
    group.add(gMesh);

    if (!this.garageSnowGeo) this.garageSnowGeo = new BoxGeometry(3.3, 0.3, 5.6);
    const snowMesh = new Mesh(this.garageSnowGeo, SnowdriftGenerator.getSnowMaterial());
    snowMesh.position.y = 2.25;
    group.add(snowMesh);

    return group;
  }
}
