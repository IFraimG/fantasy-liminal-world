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

  public static getLightPoolGeometry(): PlaneGeometry {
    if (!this.lightPoolGeo) {
      this.lightPoolGeo = new PlaneGeometry(14, 14);
      this.lightPoolGeo.rotateX(-Math.PI / 2);
    }
    return this.lightPoolGeo;
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
    const poolMesh = new Mesh(this.getLightPoolGeometry(), this.getLightPoolMaterial());
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

  /**
   * Wooden utility/telegraph power pole along snow roads (matching Image 4)
   */
  public static createTelegraphPole(hasLamp: boolean = true): Group {
    const group = new Group();
    const woodMat = new MeshStandardMaterial({ color: new Color('#453326'), roughness: 0.9 });
    const wireMat = new MeshBasicMaterial({ color: new Color('#1c1917') });

    // Tall wooden pole (8.5m)
    const poleH = 8.5;
    const pole = new Mesh(new CylinderGeometry(0.14, 0.18, poleH, 6), woodMat);
    pole.position.y = poleH / 2;
    group.add(pole);

    // Crossarm
    const cross = new Mesh(new BoxGeometry(2.4, 0.14, 0.14), woodMat);
    cross.position.set(0, poleH - 0.4, 0);
    group.add(cross);

    // White ceramic insulators
    const insulatorMat = new MeshStandardMaterial({ color: new Color('#f8fafc'), roughness: 0.2 });
    for (const xOffset of [-0.95, -0.4, 0.4, 0.95]) {
      const ins = new Mesh(new CylinderGeometry(0.04, 0.05, 0.18, 5), insulatorMat);
      ins.position.set(xOffset, poleH - 0.25, 0);
      group.add(ins);
    }

    // Street lantern hanging below crossarm
    if (hasLamp) {
      const lampArm = new Mesh(new CylinderGeometry(0.03, 0.03, 0.8, 4), woodMat);
      lampArm.position.set(0.4, poleH - 1.2, 0);
      lampArm.rotation.z = Math.PI / 3;
      group.add(lampArm);

      const bulb = new Mesh(new BoxGeometry(0.18, 0.22, 0.18), this.getLampBulbMaterial());
      bulb.position.set(0.8, poleH - 1.4, 0);
      group.add(bulb);

      // Light pool plane on ground
      const pool = new Mesh(this.getLightPoolGeometry(), this.getLightPoolMaterial());
      pool.position.set(0.8, 0.03, 0);
      group.add(pool);
    }

    return group;
  }

  /**
   * Tall foggy pine / spruce tree for dense taiga forest (matching Image 2)
   */
  public static createTallPineTree(height: number = 16): Group {
    const group = new Group();
    const barkMat = new MeshStandardMaterial({ color: new Color('#271f1b'), roughness: 0.95 });
    const needleMat = new MeshStandardMaterial({ color: new Color('#182920'), roughness: 0.85 });
    const snowMat = SnowdriftGenerator.getSnowMaterial();

    // Tall straight trunk
    const trunk = new Mesh(new CylinderGeometry(0.2, 0.45, height, 6), barkMat);
    trunk.position.y = height / 2;
    group.add(trunk);

    // Conical pine foliage layers starting halfway up
    const startY = height * 0.45;
    const layerCount = 5;
    for (let i = 0; i < layerCount; i++) {
      const t = i / layerCount;
      const layerY = startY + t * (height - startY);
      const radius = 2.4 * (1 - t * 0.7);
      const layerH = 2.2;

      const foliage = new Mesh(new CylinderGeometry(radius * 0.2, radius, layerH, 6), needleMat);
      foliage.position.y = layerY;
      group.add(foliage);

      // Snow on top of foliage
      const snow = new Mesh(new CylinderGeometry(radius * 0.18, radius * 0.85, 0.35, 6), snowMat);
      snow.position.y = layerY + layerH * 0.35;
      group.add(snow);
    }

    return group;
  }

  /**
   * Weathered wooden cross on snowy hill (Northern memorial / graveyard, matching Image 5)
   */
  public static createNorthernCross(scale: number = 1.0): Group {
    const group = new Group();
    const woodMat = new MeshStandardMaterial({ color: new Color('#453527'), roughness: 0.92 });
    const snowMat = SnowdriftGenerator.getSnowMaterial();

    const h = 2.8 * scale;
    // Vertical beam
    const vert = new Mesh(new BoxGeometry(0.18 * scale, h, 0.18 * scale), woodMat);
    vert.position.y = h / 2;
    group.add(vert);

    // Main horizontal crossbar
    const horiz = new Mesh(new BoxGeometry(1.6 * scale, 0.16 * scale, 0.16 * scale), woodMat);
    horiz.position.y = h * 0.72;
    group.add(horiz);

    // Snow atop horizontal crossbar
    const horizSnow = new Mesh(new BoxGeometry(1.65 * scale, 0.08 * scale, 0.22 * scale), snowMat);
    horizSnow.position.y = h * 0.72 + 0.1 * scale;
    group.add(horizSnow);

    // Lower slanted footrest crossbar (traditional Orthodox / Pomor northern cross)
    const slant = new Mesh(new BoxGeometry(0.7 * scale, 0.12 * scale, 0.14 * scale), woodMat);
    slant.position.y = h * 0.35;
    slant.rotation.z = -0.32;
    group.add(slant);

    // Snowdrift at base
    const mound = SnowdriftGenerator.createSnowMound(1.6 * scale, 1.4 * scale, 0.6 * scale);
    mound.position.y = 0;
    group.add(mound);

    return group;
  }
}

