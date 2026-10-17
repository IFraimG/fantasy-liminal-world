import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Group,
  Color,
  Vector3
} from '@iwsdk/core';
import { ProceduralTextures } from '../textures.js';
import { SnowdriftGenerator } from './snowdrifts.js';
import { BoxCollider, BuildingInterior } from '../collision/collisionSystem.js';

export interface BuildingOptions {
  floors?: number;
  width?: number; // meters along X
  depth?: number; // meters along Z
  isLShaped?: boolean;
}

export interface AnimatedDoor {
  pivot: Group;
  worldPos: Vector3;
  targetAngle: number;
  currentAngle: number;
  isOpen: boolean;
  update: (playerPos: Vector3, delta: number) => void;
}

export interface BuildingResult {
  group: Group;
  colliders: BoxCollider[];
  interior: BuildingInterior;
  doors: AnimatedDoor[];
}

/**
 * Authentic Soviet Panel Apartment Building (Хрущевка Серия 1-335)
 * - Deep anchored concrete foundation plinth (no hanging gaps on hills)
 * - True Series 1-335 layout:
 *   * Central stairwell with ribbon vertical glazing (ленточное остекление)
 *   * Classic two-flight concrete stairs with 180° turn on intermediate landings
 *   * Two-tone Soviet entrance painting (lower half turquoise oil paint, upper half white chalk)
 *   * Floor landing with metal mailboxes (1st floor) and electrical panels (all floors)
 *   * 4 apartments per floor with entrance halls/corridors, partition walls, and rooms
 *   * Zero texture bleed: distinct exterior facades and interior wallpaper/plaster
 */
export class BuildingGenerator {
  // Shared materials
  private static facadeMaterial: MeshStandardMaterial | null = null;
  private static snowRoofMaterial: MeshStandardMaterial | null = null;
  private static foundationMaterial: MeshStandardMaterial | null = null;
  private static metalDoorMaterial: MeshStandardMaterial | null = null;
  private static porchBulbMaterial: MeshBasicMaterial | null = null;
  private static railingMaterial: MeshStandardMaterial | null = null;
  private static stairTreadMaterial: MeshStandardMaterial | null = null;

  // Authentic interior materials
  private static stairwellLowerMaterial: MeshStandardMaterial | null = null;
  private static stairwellUpperMaterial: MeshStandardMaterial | null = null;
  private static stairwellFloorMaterial: MeshStandardMaterial | null = null;
  private static aptWallMaterial: MeshStandardMaterial | null = null;
  private static aptFloorMaterial: MeshStandardMaterial | null = null;
  private static glassMaterial: MeshStandardMaterial | null = null;
  private static mailboxMaterial: MeshStandardMaterial | null = null;
  private static elecPanelMaterial: MeshStandardMaterial | null = null;

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
      color: new Color('#32373e'),
      roughness: 0.92,
      metalness: 0.1,
    });
    return this.foundationMaterial;
  }

  public static getMetalDoorMaterial(): MeshStandardMaterial {
    if (this.metalDoorMaterial) return this.metalDoorMaterial;
    this.metalDoorMaterial = new MeshStandardMaterial({
      color: new Color('#1c2026'),
      roughness: 0.65,
      metalness: 0.5,
    });
    return this.metalDoorMaterial;
  }

  public static getStairwellLowerMaterial(): MeshStandardMaterial {
    if (this.stairwellLowerMaterial) return this.stairwellLowerMaterial;
    // Classic Soviet turquoise-green oil paint (масляная панель подъезда)
    this.stairwellLowerMaterial = new MeshStandardMaterial({
      color: new Color('#285250'),
      roughness: 0.72,
      metalness: 0.1,
    });
    return this.stairwellLowerMaterial;
  }

  public static getStairwellUpperMaterial(): MeshStandardMaterial {
    if (this.stairwellUpperMaterial) return this.stairwellUpperMaterial;
    // White lime whitewash (побелка)
    this.stairwellUpperMaterial = new MeshStandardMaterial({
      color: new Color('#ebf0f5'),
      roughness: 0.96,
      metalness: 0.02,
    });
    return this.stairwellUpperMaterial;
  }

  public static getStairwellFloorMaterial(): MeshStandardMaterial {
    if (this.stairwellFloorMaterial) return this.stairwellFloorMaterial;
    this.stairwellFloorMaterial = new MeshStandardMaterial({
      color: new Color('#474c54'),
      roughness: 0.9,
      metalness: 0.08,
    });
    return this.stairwellFloorMaterial;
  }

  public static getAptWallMaterial(): MeshStandardMaterial {
    if (this.aptWallMaterial) return this.aptWallMaterial;
    // Warm residential wallpaper tint
    this.aptWallMaterial = new MeshStandardMaterial({
      color: new Color('#d4cbb8'),
      roughness: 0.92,
      metalness: 0.04,
    });
    return this.aptWallMaterial;
  }

  public static getAptFloorMaterial(): MeshStandardMaterial {
    if (this.aptFloorMaterial) return this.aptFloorMaterial;
    // Wood parquet / linoleum
    this.aptFloorMaterial = new MeshStandardMaterial({
      color: new Color('#684e38'),
      roughness: 0.82,
      metalness: 0.05,
    });
    return this.aptFloorMaterial;
  }

  public static getStairTreadMaterial(): MeshStandardMaterial {
    if (this.stairTreadMaterial) return this.stairTreadMaterial;
    this.stairTreadMaterial = new MeshStandardMaterial({
      color: new Color('#3b4047'),
      roughness: 0.88,
      metalness: 0.15,
    });
    return this.stairTreadMaterial;
  }

  public static getRailingMaterial(): MeshStandardMaterial {
    if (this.railingMaterial) return this.railingMaterial;
    this.railingMaterial = new MeshStandardMaterial({
      color: new Color('#181b1e'),
      roughness: 0.6,
      metalness: 0.7,
    });
    return this.railingMaterial;
  }

  public static getGlassMaterial(): MeshStandardMaterial {
    if (this.glassMaterial) return this.glassMaterial;
    this.glassMaterial = new MeshStandardMaterial({
      color: new Color('#9bbdcf'),
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.55,
    });
    return this.glassMaterial;
  }

  public static getMailboxMaterial(): MeshStandardMaterial {
    if (this.mailboxMaterial) return this.mailboxMaterial;
    this.mailboxMaterial = new MeshStandardMaterial({
      color: new Color('#1d3f66'),
      roughness: 0.7,
      metalness: 0.4,
    });
    return this.mailboxMaterial;
  }

  public static getElecPanelMaterial(): MeshStandardMaterial {
    if (this.elecPanelMaterial) return this.elecPanelMaterial;
    this.elecPanelMaterial = new MeshStandardMaterial({
      color: new Color('#5b636d'),
      roughness: 0.75,
      metalness: 0.35,
    });
    return this.elecPanelMaterial;
  }

  public static getPorchBulbMaterial(): MeshBasicMaterial {
    if (this.porchBulbMaterial) return this.porchBulbMaterial;
    this.porchBulbMaterial = new MeshBasicMaterial({
      color: new Color('#ffaa40'),
    });
    return this.porchBulbMaterial;
  }

  /**
   * Generates a Khrushchyovka Series 1-335 apartment building.
   */
  public static createBuilding(
    options: BuildingOptions = {},
    worldOriginX: number = 0,
    worldOriginY: number = 0,
    worldOriginZ: number = 0
  ): BuildingResult {
    const group = new Group();
    const floors = options.floors ?? 4;
    const floorHeight = 2.8;
    const totalHeight = floors * floorHeight;
    const width = options.width ?? 34;
    const depth = options.depth ?? 12;

    const colliders: BoxCollider[] = [];
    const doors: AnimatedDoor[] = [];

    // Local-to-world collision register helper
    const addCol = (minX: number, maxX: number, minZ: number, maxZ: number, minY: number = -10, maxY: number = totalHeight + 10) => {
      colliders.push({
        minX: worldOriginX + minX,
        maxX: worldOriginX + maxX,
        minZ: worldOriginZ + minZ,
        maxZ: worldOriginZ + maxZ,
        minY: worldOriginY + minY,
        maxY: worldOriginY + maxY,
        id: `bld_${worldOriginX}_${worldOriginZ}`
      });
    };

    // ==========================================
    // 1. DEEP ANCHORED FOUNDATION (NO GAPS ON SLOPES)
    // ==========================================
    const foundDepth = 6.0;
    const foundGeo = new BoxGeometry(width + 0.4, foundDepth, depth + 0.4);
    const foundMesh = new Mesh(foundGeo, this.getFoundationMaterial());
    foundMesh.position.y = -foundDepth / 2;
    group.add(foundMesh);

    const plinthMesh = new Mesh(new BoxGeometry(width + 0.6, 0.45, depth + 0.6), this.getFoundationMaterial());
    plinthMesh.position.y = 0.22;
    group.add(plinthMesh);

    // ==========================================
    // 2. EXTERIOR WALLS (FACADE OUTSIDE, PLASTER INSIDE)
    // ==========================================
    const wallThick = 0.35;
    const frontZ = depth / 2;
    const backZ = -depth / 2;
    const doorW = 1.6;
    const doorH = 2.2;

    // Back wall: Left & Right apartment facades
    const backWallLeft = new Mesh(new BoxGeometry(width / 2 - 1.6, totalHeight, wallThick), this.getFacadeMaterial());
    backWallLeft.position.set(-width / 4 - 0.8, totalHeight / 2, backZ + wallThick / 2);
    group.add(backWallLeft);

    const backWallRight = new Mesh(new BoxGeometry(width / 2 - 1.6, totalHeight, wallThick), this.getFacadeMaterial());
    backWallRight.position.set(width / 4 + 0.8, totalHeight / 2, backZ + wallThick / 2);
    group.add(backWallRight);

    // Center Back: Series 1-335 VERTICAL RIBBON GLAZING (ленточное остекление лестничной клетки)
    const ribbonWinW = 3.2;
    const ribbonGlass = new Mesh(new BoxGeometry(ribbonWinW, totalHeight - 0.8, 0.1), this.getGlassMaterial());
    ribbonGlass.position.set(0, totalHeight / 2 + 0.2, backZ + wallThick / 2);
    group.add(ribbonGlass);

    // Ribbon mullions (mullion frame)
    for (let f = 1; f < floors; f++) {
      const transom = new Mesh(new BoxGeometry(ribbonWinW, 0.18, 0.16), this.getFoundationMaterial());
      transom.position.set(0, f * floorHeight, backZ + wallThick / 2);
      group.add(transom);
    }
    addCol(-width / 2, width / 2, backZ, backZ + wallThick);

    // Outer side walls
    const leftWall = new Mesh(new BoxGeometry(wallThick, totalHeight, depth), this.getFacadeMaterial());
    leftWall.position.set(-width / 2 + wallThick / 2, totalHeight / 2, 0);
    group.add(leftWall);
    addCol(-width / 2, -width / 2 + wallThick, backZ, frontZ);

    const rightWall = new Mesh(new BoxGeometry(wallThick, totalHeight, depth), this.getFacadeMaterial());
    rightWall.position.set(width / 2 - wallThick / 2, totalHeight / 2, 0);
    group.add(rightWall);
    addCol(width / 2 - wallThick, width / 2, backZ, frontZ);

    // Front facade walls (split for entrance door at center)
    const frontLeftW = width / 2 - doorW / 2;
    const frontLeft = new Mesh(new BoxGeometry(frontLeftW, totalHeight, wallThick), this.getFacadeMaterial());
    frontLeft.position.set(-width / 2 + frontLeftW / 2, totalHeight / 2, frontZ - wallThick / 2);
    group.add(frontLeft);
    addCol(-width / 2, -doorW / 2, frontZ - wallThick, frontZ);

    const frontRightW = width / 2 - doorW / 2;
    const frontRight = new Mesh(new BoxGeometry(frontRightW, totalHeight, wallThick), this.getFacadeMaterial());
    frontRight.position.set(width / 2 - frontRightW / 2, totalHeight / 2, frontZ - wallThick / 2);
    group.add(frontRight);
    addCol(doorW / 2, width / 2, frontZ - wallThick, frontZ);

    const frontLintel = new Mesh(new BoxGeometry(doorW, totalHeight - doorH, wallThick), this.getFacadeMaterial());
    frontLintel.position.set(0, doorH + (totalHeight - doorH) / 2, frontZ - wallThick / 2);
    group.add(frontLintel);

    // Entrance canopy & animated door
    const canopy = new Mesh(new BoxGeometry(3.2, 0.22, 1.8), this.getFoundationMaterial());
    canopy.position.set(0, doorH + 0.35, frontZ + 0.9);
    group.add(canopy);

    const canopySnow = new Mesh(new BoxGeometry(3.3, 0.2, 1.9), this.getSnowRoofMaterial());
    canopySnow.position.set(0, doorH + 0.52, frontZ + 0.9);
    group.add(canopySnow);

    const porchBulb = new Mesh(new BoxGeometry(0.3, 0.15, 0.2), this.getPorchBulbMaterial());
    porchBulb.position.set(0, doorH + 0.18, frontZ + 0.7);
    group.add(porchBulb);

    // Animated entrance door on hinges
    const doorPivot = new Group();
    doorPivot.position.set(-doorW / 2 + 0.05, 0, frontZ - wallThick / 2);

    const doorLeaf = new Mesh(new BoxGeometry(doorW - 0.08, doorH, 0.08), this.getMetalDoorMaterial());
    doorLeaf.position.set((doorW - 0.08) / 2, doorH / 2, 0);
    doorPivot.add(doorLeaf);

    const doorHandle = new Mesh(new BoxGeometry(0.06, 0.24, 0.14), this.getRailingMaterial());
    doorHandle.position.set(doorW - 0.22, 1.05, 0);
    doorPivot.add(doorHandle);
    group.add(doorPivot);

    const doorWorldCenter = new Vector3(worldOriginX, worldOriginY + doorH / 2, worldOriginZ + frontZ);
    const animatedDoor: AnimatedDoor = {
      pivot: doorPivot,
      worldPos: doorWorldCenter,
      targetAngle: 0,
      currentAngle: 0,
      isOpen: false,
      update: (playerPos: Vector3, delta: number) => {
        const dist = playerPos.distanceTo(doorWorldCenter);
        if (dist < 3.2) {
          animatedDoor.targetAngle = -Math.PI * 0.48; // swing open inwards
          animatedDoor.isOpen = true;
        } else if (dist >= 4.0) {
          animatedDoor.targetAngle = 0; // close
          animatedDoor.isOpen = false;
        }
        animatedDoor.currentAngle += (animatedDoor.targetAngle - animatedDoor.currentAngle) * Math.min(1.0, delta * 4.2);
        doorPivot.rotation.y = animatedDoor.currentAngle;
      }
    };
    doors.push(animatedDoor);

    // ==========================================
    // 3. CENTRAL STAIRWELL (ПОДЪЕЗД СЕРИИ 1-335)
    // ==========================================
    const stairHalfW = 1.6; // Stairwell width 3.2m: x in [-1.6, 1.6]
    const landingZStart = 2.8; // Floor landing: z in [2.8, 5.8]
    const flightZEnd = -0.5;   // Flight runs between z = 2.8 and z = -0.5
    const interZEnd = -2.0;    // Intermediate landing: z in [-2.0, -0.5]
    const partThick = 0.18;

    // Mailbox unit on Ground Floor (1st floor)
    const mailbox = new Mesh(new BoxGeometry(0.18, 1.3, 1.1), this.getMailboxMaterial());
    mailbox.position.set(-stairHalfW + 0.12, 1.4, 4.2);
    group.add(mailbox);

    // Per-floor structure
    for (let f = 0; f < floors; f++) {
      const floorY = f * floorHeight;

      // 1. Two-tone interior walls of the stairwell:
      // Left and right enclosing walls of the stairwell
      const lowerH = 1.35; // Lower turquoise oil paint
      const upperH = floorHeight - lowerH; // Upper white chalk

      // Left stairwell wall (lower & upper)
      const leftLower = new Mesh(new BoxGeometry(partThick, lowerH, depth - 0.4), this.getStairwellLowerMaterial());
      leftLower.position.set(-stairHalfW - partThick / 2, floorY + lowerH / 2, 0);
      group.add(leftLower);

      const leftUpper = new Mesh(new BoxGeometry(partThick, upperH, depth - 0.4), this.getStairwellUpperMaterial());
      leftUpper.position.set(-stairHalfW - partThick / 2, floorY + lowerH + upperH / 2, 0);
      group.add(leftUpper);

      // Right stairwell wall (lower & upper)
      const rightLower = new Mesh(new BoxGeometry(partThick, lowerH, depth - 0.4), this.getStairwellLowerMaterial());
      rightLower.position.set(stairHalfW + partThick / 2, floorY + lowerH / 2, 0);
      group.add(rightLower);

      const rightUpper = new Mesh(new BoxGeometry(partThick, upperH, depth - 0.4), this.getStairwellUpperMaterial());
      rightUpper.position.set(stairHalfW + partThick / 2, floorY + lowerH + upperH / 2, 0);
      group.add(rightUpper);

      // Floor Landing slab (этажная площадка) - strictly inside stairwell interior
      const maxLandingZ = frontZ - wallThick - 0.08;
      const landingDepth = maxLandingZ - landingZStart;
      const landingMesh = new Mesh(new BoxGeometry(stairHalfW * 2 - 0.1, 0.16, landingDepth), this.getStairwellFloorMaterial());
      landingMesh.position.set(0, floorY + 0.08, landingZStart + landingDepth / 2);
      group.add(landingMesh);

      // Intermediate Landing slab (междуэтажная площадка у окна)
      if (f < floors - 1) {
        const interMesh = new Mesh(new BoxGeometry(stairHalfW * 2, 0.2, flightZEnd - interZEnd), this.getStairwellFloorMaterial());
        interMesh.position.set(0, floorY + floorHeight * 0.5 + 0.1, (flightZEnd + interZEnd) / 2);
        group.add(interMesh);
      }

      // Electrical cabinet on floor landing (электрощиток)
      const elecPanel = new Mesh(new BoxGeometry(0.14, 0.9, 0.7), this.getElecPanelMaterial());
      elecPanel.position.set(stairHalfW - 0.1, floorY + 1.6, 4.4);
      group.add(elecPanel);

      // Apartment entrance doors on the floor landing (4 apartments: 2 on left, 2 on right)
      // Left doors: кв 1 & кв 2
      const aptDoorGeo = new BoxGeometry(0.08, 2.1, 0.95);
      const doorApt1 = new Mesh(aptDoorGeo, this.getMetalDoorMaterial());
      doorApt1.position.set(-stairHalfW + 0.05, floorY + 1.05, 3.4);
      group.add(doorApt1);

      const doorApt2 = new Mesh(aptDoorGeo, this.getMetalDoorMaterial());
      doorApt2.position.set(-stairHalfW + 0.05, floorY + 1.05, 4.8);
      group.add(doorApt2);

      // Right doors: кв 3 & кв 4
      const doorApt3 = new Mesh(aptDoorGeo, this.getMetalDoorMaterial());
      doorApt3.position.set(stairHalfW - 0.05, floorY + 1.05, 3.4);
      group.add(doorApt3);

      const doorApt4 = new Mesh(aptDoorGeo, this.getMetalDoorMaterial());
      doorApt4.position.set(stairHalfW - 0.05, floorY + 1.05, 4.8);
      group.add(doorApt4);

      // Colliders for stairwell side walls (leaving open doorways into the apartments!)
      // Left side wall colliders with door openings
      addCol(-stairHalfW - partThick, -stairHalfW, backZ, 2.8);
      addCol(-stairHalfW - partThick, -stairHalfW, 4.0, 4.2);
      addCol(-stairHalfW - partThick, -stairHalfW, 5.4, frontZ);

      // Right side wall colliders with door openings
      addCol(stairHalfW, stairHalfW + partThick, backZ, 2.8);
      addCol(stairHalfW, stairHalfW + partThick, 4.0, 4.2);
      addCol(stairHalfW, stairHalfW + partThick, 5.4, frontZ);

      // ==========================================
      // TWO-FLIGHT STAIRS (ДВУХМАРШЕВАЯ ЛЕСТНИЦА)
      // ==========================================
      if (f < floors - 1) {
        const flightLen = landingZStart - flightZEnd; // 3.3m
        const flightW = 1.35;
        const stepsPerFlight = 10;
        const stepH = (floorHeight * 0.5) / stepsPerFlight;
        const stepD = flightLen / stepsPerFlight;

        // --- FLIGHT 1 (Right side: Ascends from z=2.8 to z=-0.5, y=floorY to floorY+1.4) ---
        const f1CenterX = (0.2 + stairHalfW) / 2;
        const f1CenterZ = (landingZStart + flightZEnd) / 2;

        const ramp1 = new Mesh(new BoxGeometry(flightW, 0.12, flightLen), this.getStairTreadMaterial());
        ramp1.position.set(f1CenterX, floorY + floorHeight * 0.25, f1CenterZ);
        ramp1.rotation.x = Math.atan2(floorHeight * 0.5, flightLen);
        group.add(ramp1);

        for (let s = 0; s < stepsPerFlight; s++) {
          const stepMesh = new Mesh(new BoxGeometry(flightW, stepH, stepD), this.getStairTreadMaterial());
          stepMesh.position.set(
            f1CenterX,
            floorY + (s + 0.5) * stepH,
            landingZStart - (s + 0.5) * stepD
          );
          group.add(stepMesh);
        }

        // Railing for Flight 1 (on inner side at x = 0.15)
        const rail1 = new Mesh(new BoxGeometry(0.06, 0.06, flightLen), this.getRailingMaterial());
        rail1.position.set(0.18, floorY + floorHeight * 0.25 + 0.85, f1CenterZ);
        rail1.rotation.x = Math.atan2(floorHeight * 0.5, flightLen);
        group.add(rail1);

        // --- FLIGHT 2 (Left side: Ascends from z=-0.5 to z=2.8, y=floorY+1.4 to (floorY+1)*floorHeight) ---
        const f2CenterX = (-stairHalfW - 0.2) / 2;
        const f2CenterZ = (flightZEnd + landingZStart) / 2;

        const ramp2 = new Mesh(new BoxGeometry(flightW, 0.12, flightLen), this.getStairTreadMaterial());
        ramp2.position.set(f2CenterX, floorY + floorHeight * 0.75, f2CenterZ);
        ramp2.rotation.x = -Math.atan2(floorHeight * 0.5, flightLen);
        group.add(ramp2);

        for (let s = 0; s < stepsPerFlight; s++) {
          const stepMesh = new Mesh(new BoxGeometry(flightW, stepH, stepD), this.getStairTreadMaterial());
          stepMesh.position.set(
            f2CenterX,
            floorY + floorHeight * 0.5 + (s + 0.5) * stepH,
            flightZEnd + (s + 0.5) * stepD
          );
          group.add(stepMesh);
        }

        // Railing for Flight 2 (on inner side at x = -0.15)
        const rail2 = new Mesh(new BoxGeometry(0.06, 0.06, flightLen), this.getRailingMaterial());
        rail2.position.set(-0.18, floorY + floorHeight * 0.75 + 0.85, f2CenterZ);
        rail2.rotation.x = -Math.atan2(floorHeight * 0.5, flightLen);
        group.add(rail2);
      }

      // ==========================================
      // APARTMENTS & CORRIDORS (4 КВАРТИРЫ НА ЭТАЖЕ)
      // ==========================================
      const aptFloorW = (width / 2 - stairHalfW - partThick) - wallThick - 0.15;
      const aptFloorDepth = depth - wallThick * 2 - 0.2; // 11.1m (strictly inside frontZ and backZ)
      const leftCenterX = -width / 2 + wallThick + 0.08 + aptFloorW / 2;
      const rightCenterX = width / 2 - wallThick - 0.08 - aptFloorW / 2;

      // Left Wing Floor Slab (квартиры 1 и 2) - safely inside interior boundaries (ZERO facade bleed)
      const leftWingMesh = new Mesh(new BoxGeometry(aptFloorW, 0.16, aptFloorDepth), this.getAptFloorMaterial());
      leftWingMesh.position.set(leftCenterX, floorY + 0.08, 0);
      group.add(leftWingMesh);

      // Right Wing Floor Slab (квартиры 3 и 4) - safely inside interior boundaries (ZERO facade bleed)
      const rightWingMesh = new Mesh(new BoxGeometry(aptFloorW, 0.16, aptFloorDepth), this.getAptFloorMaterial());
      rightWingMesh.position.set(rightCenterX, floorY + 0.08, 0);
      group.add(rightWingMesh);

      // Inter-apartment dividing wall (между передними и задними квартирами по z = 0.8)
      // Left wing partition
      const leftDiv = new Mesh(new BoxGeometry(aptFloorW, floorHeight, partThick), this.getAptWallMaterial());
      leftDiv.position.set(leftCenterX, floorY + floorHeight / 2, 0.8);
      group.add(leftDiv);
      addCol(leftCenterX - aptFloorW / 2, leftCenterX + aptFloorW / 2, 0.8 - partThick / 2, 0.8 + partThick / 2);

      // Right wing partition
      const rightDiv = new Mesh(new BoxGeometry(aptFloorW, floorHeight, partThick), this.getAptWallMaterial());
      rightDiv.position.set(rightCenterX, floorY + floorHeight / 2, 0.8);
      group.add(rightDiv);
      addCol(rightCenterX - aptFloorW / 2, rightCenterX + aptFloorW / 2, 0.8 - partThick / 2, 0.8 + partThick / 2);

      // Corridor partition walls inside apartments (прихожие)
      // Left apartment corridor wall (forming hallway from door to rooms)
      const leftCorr = new Mesh(new BoxGeometry(partThick, floorHeight, 2.2), this.getAptWallMaterial());
      leftCorr.position.set(-stairHalfW - 2.8, floorY + floorHeight / 2, 3.8);
      group.add(leftCorr);
      addCol(-stairHalfW - 2.8 - partThick / 2, -stairHalfW - 2.8 + partThick / 2, 2.7, 4.9);

      // Right apartment corridor wall
      const rightCorr = new Mesh(new BoxGeometry(partThick, floorHeight, 2.2), this.getAptWallMaterial());
      rightCorr.position.set(stairHalfW + 2.8, floorY + floorHeight / 2, 3.8);
      group.add(rightCorr);
      addCol(stairHalfW + 2.8 - partThick / 2, stairHalfW + 2.8 + partThick / 2, 2.7, 4.9);
    }

    // ==========================================
    // 4. ROOF & SNOW CAP
    // ==========================================
    const roofThick = 0.4;
    const roofMesh = new Mesh(new BoxGeometry(width + 0.4, roofThick, depth + 0.4), this.getSnowRoofMaterial());
    roofMesh.position.y = totalHeight + roofThick / 2;
    group.add(roofMesh);

    // ==========================================
    // 5. BUILDING INTERIOR DEFINITION FOR COLLISION SYSTEM
    // ==========================================
    const interior: BuildingInterior = {
      id: `bld_interior_${worldOriginX}_${worldOriginZ}`,
      minX: worldOriginX - width / 2 + wallThick,
      maxX: worldOriginX + width / 2 - wallThick,
      minZ: worldOriginZ + backZ + wallThick,
      maxZ: worldOriginZ + frontZ - wallThick,
      baseY: worldOriginY,
      floors,
      floorHeight,
      originX: worldOriginX,
      originZ: worldOriginZ,
      doorX: worldOriginX,
      doorZ: worldOriginZ + frontZ
    };

    return {
      group,
      colliders,
      interior,
      doors
    };
  }
}
