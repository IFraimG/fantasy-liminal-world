import {
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  BufferAttribute,
  Group,
  Color
} from '@iwsdk/core';
import { ProceduralTextures } from '../textures.js';
import { TerrainElevation } from './terrain.js';

/**
 * Creates realistic organic snowdrifts (сугробы) and snowbanks:
 * - Conformal snowdrifts that dynamically follow terrain elevation slopes without floating or seams
 * - Volumetric snow mounds for prop bases with seamless downward skirts
 */
export class SnowdriftGenerator {
  private static snowMaterial: MeshStandardMaterial | null = null;

  public static getSnowMaterial(): MeshStandardMaterial {
    if (this.snowMaterial) return this.snowMaterial;

    const texture = ProceduralTextures.getSnowRoadTexture();
    this.snowMaterial = new MeshStandardMaterial({
      color: new Color('#edf2f8'),
      roughness: 0.95,
      metalness: 0.05,
      map: texture,
    });
    return this.snowMaterial;
  }

  /**
   * Generates a curved organic snow mound that seamlessly conforms to the terrain elevation.
   * Edge vertices tuck slightly into the ground (-0.05m), eliminating any floating polygons or gaps!
   */
  public static createConformalSnowMound(
    worldOriginX: number,
    worldOriginZ: number,
    length: number,
    width: number,
    maxHeight: number
  ): Mesh {
    const segmentsX = Math.max(8, Math.min(24, Math.floor(length / 2.0)));
    const segmentsY = Math.max(6, Math.min(16, Math.floor(width / 1.5)));
    const geo = new PlaneGeometry(length, width, segmentsX, segmentsY);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = worldOriginX + lx;
      const wz = worldOriginZ + lz;

      const groundY = TerrainElevation.getHeight(wx, wz);

      const normZ = 1 - Math.min(1, Math.abs(lz) / (width / 2));
      const normX = 1 - Math.min(1, Math.abs(lx) / (length / 2));

      // Organic bell-curved snow mound profile
      const ridge = Math.pow(Math.sin(normZ * Math.PI * 0.5), 1.6) * Math.sin(normX * Math.PI);
      const noise = Math.sin(wx * 0.3) * Math.cos(wz * 0.4) * 0.12;
      const moundY = Math.max(0, ridge * maxHeight + noise * maxHeight);

      // On boundary vertices, slightly tuck into the snow surface to guarantee zero seams or gaps
      const isBoundary = normZ < 0.06 || normX < 0.06;
      const finalY = groundY + (isBoundary ? -0.05 : moundY);

      pos.setY(i, finalY);
    }
    geo.computeVertexNormals();

    const mesh = new Mesh(geo, this.getSnowMaterial());
    mesh.receiveShadow = true;
    return mesh;
  }

  /**
   * Generates a curved organic snow mound for prop bases (lanterns, crosses, trees).
   * Edge vertices drop below 0 to form a downward skirt that penetrates the ground,
   * ensuring no floating underside is visible even on slight slopes.
   */
  public static createSnowMound(length: number, width: number, maxHeight: number): Mesh {
    const segmentsX = 12;
    const segmentsY = 8;
    const geo = new PlaneGeometry(length, width, segmentsX, segmentsY);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      const normZ = 1 - Math.min(1, Math.abs(z) / (width / 2));
      const normX = 1 - Math.min(1, Math.abs(x) / (length / 2));

      const ridge = Math.pow(Math.sin(normZ * Math.PI * 0.5), 1.7) * Math.sin(normX * Math.PI);
      const noise = Math.sin(x * 1.2) * Math.cos(z * 1.5) * 0.08;

      // Drop edges slightly below 0 so the mound skirts into the ground
      const isEdge = normZ < 0.08 || normX < 0.08;
      const y = isEdge ? -0.15 : Math.max(0, ridge * maxHeight + noise * maxHeight);

      pos.setY(i, y);
    }
    geo.computeVertexNormals();

    const mesh = new Mesh(geo, this.getSnowMaterial());
    mesh.receiveShadow = true;
    return mesh;
  }

  /**
   * Creates a snowbank along a building foundation
   */
  public static createBuildingSnowbank(buildingWidth: number): Group {
    const group = new Group();
    const driftFront = this.createSnowMound(buildingWidth * 1.05, 3.5, 1.2);
    driftFront.position.set(0, 0, 1.2);
    group.add(driftFront);
    return group;
  }
}
