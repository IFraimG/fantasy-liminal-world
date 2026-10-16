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
 * Procedural generator for authentic Soviet panel apartment buildings (хрущевки / панельки)
 * with real walkable interiors, floor slabs, staircases, and animated opening doors.
 */
export class BuildingGenerator {
  private static facadeMaterial: MeshStandardMaterial | null = null;
  private static interiorWallMaterial: MeshStandardMaterial | null = null;
  private static interiorFloorMaterial: MeshStandardMaterial | null = null;
  private static snowRoofMaterial: MeshStandardMaterial | null = null;
  private static foundationMaterial: MeshStandardMaterial | null = null;
  private static metalDoorMaterial: MeshStandardMaterial | null = null;
  private static porchBulbMaterial: MeshBasicMaterial | null = null;
  private static railingMaterial: MeshStandardMaterial | null = null;

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

  public static getInteriorWallMaterial(): MeshStandardMaterial {
    if (this.interiorWallMaterial) return this.interiorWallMaterial;
    this.interiorWallMaterial = new MeshStandardMaterial({
      color: new Color('#b8c2cc'),
      roughness: 0.92,
      metalness: 0.05,
    });
    return this.interiorWallMaterial;
  }

  public static getInteriorFloorMaterial(): MeshStandardMaterial {
    if (this.interiorFloorMaterial) return this.interiorFloorMaterial;
    this.interiorFloorMaterial = new MeshStandardMaterial({
      color: new Color('#565b63'),
      roughness: 0.88,
      metalness: 0.08,
    });
    return this.interiorFloorMaterial;
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
      color: new Color('#363b42'),
      roughness: 0.92,
      metalness: 0.1,
    });
    return this.foundationMaterial;
  }

  public static getMetalDoorMaterial(): MeshStandardMaterial {
    if (this.metalDoorMaterial) return this.metalDoorMaterial;
    this.metalDoorMaterial = new MeshStandardMaterial({
      color: new Color('#22262c'),
      roughness: 0.65,
      metalness: 0.45,
    });
    return this.metalDoorMaterial;
  }

  public static getPorchBulbMaterial(): MeshBasicMaterial {
    if (this.porchBulbMaterial) return this.porchBulbMaterial;
    this.porchBulbMaterial = new MeshBasicMaterial({
      color: new Color('#ffb356'),
    });
    return this.porchBulbMaterial;
  }

  public static getRailingMaterial(): MeshStandardMaterial {
    if (this.railingMaterial) return this.railingMaterial;
    this.railingMaterial = new MeshStandardMaterial({
      color: new Color('#1c2024'),
      roughness: 0.7,
      metalness: 0.5,
    });
    return this.railingMaterial;
  }

  /**
   * Generates a complete building with:
   * 1. Deep solid concrete foundation (6m deep) anchored into slope
   * 2. Walkable interior with real floor slabs and empty rooms
   * 3. Working staircase climbing to upper floors
   * 4. Animated automatic entrance door with smooth hinge opening
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
    const wallThick = 0.35;

    const colliders: BoxCollider[] = [];
    const doors: AnimatedDoor[] = [];

    // Helper to register colliders in world space
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
    // 1. DEEP ANCHORED FOUNDATION PLINTH (NO VOID ON SLOPES)
    // ==========================================
    const foundDepth = 6.0; // penetrates 6m down into the terrain/snow
    const foundGeo = new BoxGeometry(width + 0.4, foundDepth, depth + 0.4);
    const foundMesh = new Mesh(foundGeo, this.getFoundationMaterial());
    foundMesh.position.y = -foundDepth / 2;
    group.add(foundMesh);

    // Foundation collar at ground level
    const collarGeo = new BoxGeometry(width + 0.6, 0.45, depth + 0.6);
    const collarMesh = new Mesh(collarGeo, this.getFoundationMaterial());
    collarMesh.position.y = 0.22;
    group.add(collarMesh);

    // ==========================================
    // 2. EXTERIOR WALLS (WITH ENTRANCE DOORWAY)
    // ==========================================
    const doorW = 1.6;
    const doorH = 2.2;
    const entranceX = 0; // centered entrance
    const frontZ = depth / 2;
    const backZ = -depth / 2;

    // Back wall (solid)
    const backWall = new Mesh(new BoxGeometry(width, totalHeight, wallThick), this.getFacadeMaterial());
    backWall.position.set(0, totalHeight / 2, backZ + wallThick / 2);
    group.add(backWall);
    addCol(-width / 2, width / 2, backZ, backZ + wallThick);

    // Left outer wall
    const leftWall = new Mesh(new BoxGeometry(wallThick, totalHeight, depth), this.getFacadeMaterial());
    leftWall.position.set(-width / 2 + wallThick / 2, totalHeight / 2, 0);
    group.add(leftWall);
    addCol(-width / 2, -width / 2 + wallThick, backZ, frontZ);

    // Right outer wall
    const rightWall = new Mesh(new BoxGeometry(wallThick, totalHeight, depth), this.getFacadeMaterial());
    rightWall.position.set(width / 2 - wallThick / 2, totalHeight / 2, 0);
    group.add(rightWall);
    addCol(width / 2 - wallThick, width / 2, backZ, frontZ);

    // Front wall: Left segment (from -width/2 to -doorW/2)
    const leftFrontW = width / 2 - doorW / 2;
    const leftFrontWall = new Mesh(new BoxGeometry(leftFrontW, totalHeight, wallThick), this.getFacadeMaterial());
    leftFrontWall.position.set(-width / 2 + leftFrontW / 2, totalHeight / 2, frontZ - wallThick / 2);
    group.add(leftFrontWall);
    addCol(-width / 2, -doorW / 2, frontZ - wallThick, frontZ);

    // Front wall: Right segment (from doorW/2 to width/2)
    const rightFrontW = width / 2 - doorW / 2;
    const rightFrontWall = new Mesh(new BoxGeometry(rightFrontW, totalHeight, wallThick), this.getFacadeMaterial());
    rightFrontWall.position.set(width / 2 - rightFrontW / 2, totalHeight / 2, frontZ - wallThick / 2);
    group.add(rightFrontWall);
    addCol(doorW / 2, width / 2, frontZ - wallThick, frontZ);

    // Front wall: Lintel above entrance door (from y = doorH to totalHeight)
    const lintelH = totalHeight - doorH;
    const lintel = new Mesh(new BoxGeometry(doorW, lintelH, wallThick), this.getFacadeMaterial());
    lintel.position.set(entranceX, doorH + lintelH / 2, frontZ - wallThick / 2);
    group.add(lintel);

    // ==========================================
    // 3. ENTRANCE CANOPY & ANIMATED SMOOTH DOOR
    // ==========================================
    const canopy = new Mesh(new BoxGeometry(3.2, 0.22, 1.8), this.getFoundationMaterial());
    canopy.position.set(entranceX, doorH + 0.35, frontZ + 0.9);
    group.add(canopy);

    const canopySnow = new Mesh(new BoxGeometry(3.3, 0.2, 1.9), this.getSnowRoofMaterial());
    canopySnow.position.set(entranceX, doorH + 0.52, frontZ + 0.9);
    group.add(canopySnow);

    const porchBulb = new Mesh(new BoxGeometry(0.3, 0.15, 0.2), this.getPorchBulbMaterial());
    porchBulb.position.set(entranceX, doorH + 0.18, frontZ + 0.7);
    group.add(porchBulb);

    // Animated hinged door
    const doorPivot = new Group();
    const hingeX = entranceX - doorW / 2 + 0.05;
    doorPivot.position.set(hingeX, 0, frontZ - wallThick / 2);

    const doorMesh = new Mesh(new BoxGeometry(doorW - 0.08, doorH, 0.08), this.getMetalDoorMaterial());
    doorMesh.position.set((doorW - 0.08) / 2, doorH / 2, 0);
    doorPivot.add(doorMesh);

    // Door handle & kickplate
    const handle = new Mesh(new BoxGeometry(0.06, 0.22, 0.14), this.getRailingMaterial());
    handle.position.set(doorW - 0.22, 1.05, 0);
    doorPivot.add(handle);

    group.add(doorPivot);

    const doorWorldCenter = new Vector3(
      worldOriginX + entranceX,
      worldOriginY + doorH / 2,
      worldOriginZ + frontZ
    );

    const animatedDoor: AnimatedDoor = {
      pivot: doorPivot,
      worldPos: doorWorldCenter,
      targetAngle: 0,
      currentAngle: 0,
      isOpen: false,
      update: (playerPos: Vector3, delta: number) => {
        const dist = playerPos.distanceTo(doorWorldCenter);
        // Open smoothly when player approaches within 3.2m
        if (dist < 3.2) {
          animatedDoor.targetAngle = -Math.PI * 0.48; // swing open inwards into the hall
          animatedDoor.isOpen = true;
        } else if (dist >= 4.0) {
          animatedDoor.targetAngle = 0; // swing closed
          animatedDoor.isOpen = false;
        }

        // Smooth physical dampening (lerp)
        animatedDoor.currentAngle += (animatedDoor.targetAngle - animatedDoor.currentAngle) * Math.min(1.0, delta * 4.2);
        doorPivot.rotation.y = animatedDoor.currentAngle;
      }
    };
    doors.push(animatedDoor);

    // ==========================================
    // 4. FLOORS, STAIRCASE, AND INTERIOR ROOMS
    // ==========================================
    const slabThick = 0.22;
    const hallHalfW = 2.2;
    const stairX1 = -hallHalfW + 0.15;
    const stairX2 = -0.35;
    const stairZ1 = frontZ - 5.4;
    const stairZ2 = frontZ - 1.2;

    // Interior partition walls between central hallway and apartment wings
    const innerWallThick = 0.2;
    const innerDoorW = 1.2;
    const innerDoorH = 2.1;

    for (let f = 0; f < floors; f++) {
      const floorY = f * floorHeight;

      // Floor slab
      if (f === 0) {
        // Ground floor: full solid slab
        const floorSlab = new Mesh(new BoxGeometry(width - 0.2, slabThick, depth - 0.2), this.getInteriorFloorMaterial());
        floorSlab.position.set(0, slabThick / 2, 0);
        group.add(floorSlab);
      } else {
        // Upper floor slabs: split with opening for the staircase!
        // East side slab (right of stairwell)
        const eastSlabW = width / 2 - 0.2;
        const eastSlab = new Mesh(new BoxGeometry(eastSlabW, slabThick, depth - 0.2), this.getInteriorFloorMaterial());
        eastSlab.position.set(eastSlabW / 2, floorY + slabThick / 2, 0);
        group.add(eastSlab);

        // West side slab outside stair cutout
        const westOuterW = width / 2 - hallHalfW;
        const westSlab = new Mesh(new BoxGeometry(westOuterW, slabThick, depth - 0.2), this.getInteriorFloorMaterial());
        westSlab.position.set(-width / 2 + westOuterW / 2, floorY + slabThick / 2, 0);
        group.add(westSlab);

        // Stair landing slab in hallway behind the stairs
        const landingDepth = (depth - 0.2) - (stairZ2 - stairZ1);
        const landingSlab = new Mesh(new BoxGeometry(hallHalfW, slabThick, landingDepth * 0.5), this.getInteriorFloorMaterial());
        landingSlab.position.set(-hallHalfW / 2, floorY + slabThick / 2, backZ + landingDepth * 0.25);
        group.add(landingSlab);
      }

      // Interior partition walls (Hallway Left & Right)
      // Left wall: x = -hallHalfW
      const wallFrontLen = Math.max(0.5, (frontZ - 1.0) - (stairZ2));
      const leftPart1 = new Mesh(new BoxGeometry(innerWallThick, floorHeight, wallFrontLen), this.getInteriorWallMaterial());
      leftPart1.position.set(-hallHalfW, floorY + floorHeight / 2, frontZ - wallFrontLen / 2 - 0.5);
      group.add(leftPart1);
      addCol(-hallHalfW - innerWallThick / 2, -hallHalfW + innerWallThick / 2, frontZ - wallFrontLen - 0.5, frontZ - 0.5);

      // Door opening into left apartment, then back wall segment
      const leftPart2 = new Mesh(new BoxGeometry(innerWallThick, floorHeight, 3.2), this.getInteriorWallMaterial());
      leftPart2.position.set(-hallHalfW, floorY + floorHeight / 2, backZ + 2.0);
      group.add(leftPart2);
      addCol(-hallHalfW - innerWallThick / 2, -hallHalfW + innerWallThick / 2, backZ + 0.4, backZ + 3.6);

      // Right wall: x = hallHalfW
      const rightPart = new Mesh(new BoxGeometry(innerWallThick, floorHeight, depth - innerDoorW - 0.8), this.getInteriorWallMaterial());
      rightPart.position.set(hallHalfW, floorY + floorHeight / 2, backZ + (depth - innerDoorW - 0.8) / 2 + 0.4);
      group.add(rightPart);
      addCol(hallHalfW - innerWallThick / 2, hallHalfW + innerWallThick / 2, backZ + 0.4, frontZ - innerDoorW - 0.4);

      // Lintel over right room doorway
      const rLintel = new Mesh(new BoxGeometry(innerWallThick, floorHeight - innerDoorH, innerDoorW), this.getInteriorWallMaterial());
      rLintel.position.set(hallHalfW, floorY + innerDoorH + (floorHeight - innerDoorH) / 2, frontZ - innerDoorW / 2 - 0.4);
      group.add(rLintel);

      // Staircase flight climbing up to next floor (for all floors except the top floor)
      if (f < floors - 1) {
        const stairLen = stairZ2 - stairZ1;
        const stairW = stairX2 - stairX1;
        const steps = 14;

        // Inclined stair ramp base
        const rampMesh = new Mesh(new BoxGeometry(stairW, 0.12, stairLen), this.getFoundationMaterial());
        rampMesh.position.set((stairX1 + stairX2) / 2, floorY + floorHeight / 2, (stairZ1 + stairZ2) / 2);
        rampMesh.rotation.x = -Math.atan2(floorHeight, stairLen);
        group.add(rampMesh);

        // Individual steps
        for (let s = 0; s < steps; s++) {
          const st = s / steps;
          const stepMesh = new Mesh(new BoxGeometry(stairW, floorHeight / steps, stairLen / steps), this.getInteriorFloorMaterial());
          stepMesh.position.set(
            (stairX1 + stairX2) / 2,
            floorY + (s + 0.5) * (floorHeight / steps),
            stairZ1 + (s + 0.5) * (stairLen / steps)
          );
          group.add(stepMesh);
        }

        // Railing
        const rail = new Mesh(new BoxGeometry(0.06, 0.06, stairLen), this.getRailingMaterial());
        rail.position.set(stairX2 + 0.04, floorY + floorHeight / 2 + 0.85, (stairZ1 + stairZ2) / 2);
        rail.rotation.x = -Math.atan2(floorHeight, stairLen);
        group.add(rail);
      }
    }

    // ==========================================
    // 5. ROOF SLAB & SNOW CAP
    // ==========================================
    const roofSnowThickness = 0.4;
    const roofMesh = new Mesh(new BoxGeometry(width + 0.4, roofSnowThickness, depth + 0.4), this.getSnowRoofMaterial());
    roofMesh.position.y = totalHeight + roofSnowThickness / 2;
    group.add(roofMesh);

    // Snowbank around foundation to blend with ground
    const frontBank = SnowdriftGenerator.createSnowMound(width * 1.02, 2.8, 1.1);
    frontBank.position.set(0, 0, frontZ + 1.2);
    group.add(frontBank);

    const backBank = SnowdriftGenerator.createSnowMound(width * 1.02, 2.8, 1.1);
    backBank.position.set(0, 0, backZ - 1.2);
    backBank.rotation.y = Math.PI;
    group.add(backBank);

    // ==========================================
    // 6. BUILDING INTERIOR DEFINITION
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
      stairMinX: worldOriginX + stairX1 - 0.2,
      stairMaxX: worldOriginX + stairX2 + 0.2,
      stairMinZ: worldOriginZ + stairZ1,
      stairMaxZ: worldOriginZ + stairZ2,
      doorX: worldOriginX + entranceX,
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
