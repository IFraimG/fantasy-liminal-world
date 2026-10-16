import { Vector3 } from '@iwsdk/core';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
  id?: string;
}

export interface BuildingInterior {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  baseY: number;
  floors: number;
  floorHeight: number;
  originX: number;
  originZ: number;
  doorX: number;
  doorZ: number;
}

/**
 * Solid Collision & Navigation System:
 * - Prevents player from clipping through walls, buildings, garages, trees, and poles
 * - Implements smooth wall sliding (no sticky corners)
 * - Tracks building interiors, floor slabs, and authentic two-flight Soviet staircases (Series 1-335)
 */
export class CollisionSystem {
  private static colliders: BoxCollider[] = [];
  private static interiors: BuildingInterior[] = [];

  public static readonly PLAYER_RADIUS = 0.38; // collision cylinder radius

  public static clear(): void {
    this.colliders = [];
    this.interiors = [];
  }

  public static addCollider(collider: BoxCollider): void {
    this.colliders.push(collider);
  }

  public static addColliders(colliders: BoxCollider[]): void {
    for (const c of colliders) {
      this.colliders.push(c);
    }
  }

  public static removeCollidersByPrefix(prefix: string): void {
    this.colliders = this.colliders.filter(c => !c.id || !c.id.startsWith(prefix));
    this.interiors = this.interiors.filter(i => !i.id.startsWith(prefix));
  }

  public static addInterior(interior: BuildingInterior): void {
    this.interiors.push(interior);
  }

  /**
   * Resolves player movement with sliding collision detection.
   * Returns the new adjusted position that does not penetrate any solid obstacles.
   */
  public static resolveMovement(
    currentPos: Vector3,
    desiredPos: Vector3,
    playerY: number,
    radius: number = CollisionSystem.PLAYER_RADIUS
  ): { x: number; z: number } {
    let resolvedX = desiredPos.x;
    let resolvedZ = desiredPos.z;

    const dx = desiredPos.x - currentPos.x;
    const dz = desiredPos.z - currentPos.z;

    // Filter relevant colliders nearby (within 12m) to keep per-frame performance under 0.05ms
    const nearby = this.colliders.filter(c => {
      if (c.minY !== undefined && c.maxY !== undefined) {
        if (playerY + 1.8 < c.minY || playerY + 0.15 > c.maxY) return false;
      }
      return (
        currentPos.x >= c.minX - 12 &&
        currentPos.x <= c.maxX + 12 &&
        currentPos.z >= c.minZ - 12 &&
        currentPos.z <= c.maxZ + 12
      );
    });

    // 1. Resolve X movement against colliders
    if (Math.abs(dx) > 0.0001) {
      for (const c of nearby) {
        if (this.testOverlap(resolvedX, currentPos.z, radius, c)) {
          if (dx > 0) {
            resolvedX = Math.min(resolvedX, c.minX - radius - 0.001);
          } else {
            resolvedX = Math.max(resolvedX, c.maxX + radius + 0.001);
          }
        }
      }
    }

    // 2. Resolve Z movement against colliders
    if (Math.abs(dz) > 0.0001) {
      for (const c of nearby) {
        if (this.testOverlap(resolvedX, resolvedZ, radius, c)) {
          if (dz > 0) {
            resolvedZ = Math.min(resolvedZ, c.minZ - radius - 0.001);
          } else {
            resolvedZ = Math.max(resolvedZ, c.maxZ + radius + 0.001);
          }
        }
      }
    }

    return { x: resolvedX, z: resolvedZ };
  }

  private static testOverlap(x: number, z: number, r: number, c: BoxCollider): boolean {
    return (
      x + r > c.minX &&
      x - r < c.maxX &&
      z + r > c.minZ &&
      z - r < c.maxZ
    );
  }

  /**
   * Calculates the exact ground height for the player, smoothly transitioning
   * between outdoor terrain, entrance doorways, two-flight Soviet staircases (Series 1-335), and apartment floors.
   */
  public static getPlayerGroundY(
    x: number,
    z: number,
    currentY: number,
    outdoorTerrainY: number
  ): number {
    for (const b of this.interiors) {
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
        // Player is inside this building!
        const relX = x - b.originX;
        const relZ = z - b.originZ;

        // Check if inside the stairwell: relX in [-1.7, 1.7], relZ in [-2.0, 5.8]
        if (relX >= -1.7 && relX <= 1.7 && relZ >= -2.0 && relZ <= 5.8) {
          const relY = Math.max(0, currentY - b.baseY);
          const currentFloor = Math.max(0, Math.min(b.floors - 2, Math.floor((relY + 0.2) / b.floorHeight)));
          const floorBase = b.baseY + currentFloor * b.floorHeight;

          if (relZ >= 2.8) {
            // Floor landing (этажная площадка)
            const topFloor = Math.min(b.floors - 1, Math.round(relY / b.floorHeight));
            return b.baseY + topFloor * b.floorHeight;
          } else if (relZ <= -0.5) {
            // Intermediate landing (междуэтажная площадка)
            return floorBase + b.floorHeight * 0.5;
          } else {
            // Flight stairs: relZ is between -0.5 and 2.8 (length = 3.3m)
            const flightLen = 3.3;
            if (relX > 0) {
              // Flight 1 (ascending from floor landing at z = 2.8 towards intermediate landing at z = -0.5)
              const t = Math.max(0, Math.min(1.0, (2.8 - relZ) / flightLen));
              return floorBase + t * (b.floorHeight * 0.5);
            } else {
              // Flight 2 (ascending from intermediate landing at z = -0.5 towards next floor landing at z = 2.8)
              const t = Math.max(0, Math.min(1.0, (relZ - (-0.5)) / flightLen));
              return floorBase + b.floorHeight * 0.5 + t * (b.floorHeight * 0.5);
            }
          }
        }

        // Inside apartments/corridors on a floor slab
        const relY = currentY - b.baseY;
        const floorIdx = Math.max(0, Math.min(b.floors - 1, Math.round(relY / b.floorHeight)));
        return b.baseY + floorIdx * b.floorHeight;
      }
    }

    // Outside: walk on snowy terrain
    return outdoorTerrainY;
  }
}
