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
   * Resolves player movement with continuous circle-to-AABB penetration & pushout.
   * Prevents clipping through walls, trees, poles, and corners while enabling smooth sliding.
   */
  public static resolveMovement(
    currentPos: Vector3,
    desiredPos: Vector3,
    playerY: number,
    radius: number = CollisionSystem.PLAYER_RADIUS
  ): { x: number; z: number } {
    let px = desiredPos.x;
    let pz = desiredPos.z;

    // Filter relevant colliders nearby (within 8m)
    const nearby = this.colliders.filter(c => {
      if (c.minY !== undefined && c.maxY !== undefined) {
        if (playerY + 1.8 < c.minY || playerY + 0.15 > c.maxY) return false;
      }
      return (
        px >= c.minX - radius - 2.5 &&
        px <= c.maxX + radius + 2.5 &&
        pz >= c.minZ - radius - 2.5 &&
        pz <= c.maxZ + radius + 2.5
      );
    });

    if (nearby.length === 0) {
      return { x: px, z: pz };
    }

    // Up to 4 relaxation iterations for corners and multi-wall contacts
    for (let iter = 0; iter < 4; iter++) {
      let anyCollision = false;

      for (const c of nearby) {
        // Find closest point on AABB to player center (px, pz)
        const qx = Math.max(c.minX, Math.min(c.maxX, px));
        const qz = Math.max(c.minZ, Math.min(c.maxZ, pz));

        const vx = px - qx;
        const vz = pz - qz;
        const distSq = vx * vx + vz * vz;

        if (distSq < radius * radius) {
          anyCollision = true;
          const dist = Math.sqrt(distSq);

          if (dist > 0.0001) {
            // Player is outside/intersecting edge: push out along contact normal
            const pen = radius - dist + 0.001;
            px += (vx / dist) * pen;
            pz += (vz / dist) * pen;
          } else {
            // Player center is inside AABB: push out to the nearest face
            const dLeft = px - c.minX;
            const dRight = c.maxX - px;
            const dBottom = pz - c.minZ;
            const dTop = c.maxZ - pz;
            const minD = Math.min(dLeft, dRight, dBottom, dTop);

            if (minD === dLeft) px = c.minX - radius - 0.002;
            else if (minD === dRight) px = c.maxX + radius + 0.002;
            else if (minD === dBottom) pz = c.minZ - radius - 0.002;
            else pz = c.maxZ + radius + 0.002;
          }
        }
      }

      if (!anyCollision) break;
    }

    return { x: px, z: pz };
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
