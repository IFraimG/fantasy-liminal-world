import {
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector3,
  BufferAttribute,
  Group,
  Color
} from '@iwsdk/core';
import { ProceduralTextures } from '../textures.js';

/**
 * Creates realistic organic snowdrifts (сугробы) and snowbanks along roads and buildings.
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
   * Generates a curved organic snow mound/drift of given length, width, and height.
   */
  public static createSnowMound(length: number, width: number, maxHeight: number): Mesh {
    const segmentsX = 14;
    const segmentsY = 8;
    const geo = new PlaneGeometry(length, width, segmentsX, segmentsY);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Distance from center across width (Z) and length (X)
      const normZ = 1 - Math.min(1, Math.abs(z) / (width / 2));
      const normX = 1 - Math.min(1, Math.abs(x) / (length / 2));

      // Organic ridge shape with noise
      const ridge = Math.pow(Math.sin(normZ * Math.PI * 0.5), 1.8) * Math.sin(normX * Math.PI);
      const noise = Math.sin(x * 0.8) * Math.cos(z * 1.5) * 0.15;
      const y = Math.max(0, ridge * maxHeight + noise * maxHeight);

      pos.setY(i, y);
    }
    geo.computeVertexNormals();

    const mesh = new Mesh(geo, this.getSnowMaterial());
    mesh.castShadow = true;
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
