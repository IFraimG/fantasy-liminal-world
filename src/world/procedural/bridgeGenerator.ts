import {
  Group,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  Color
} from '@iwsdk/core';

/**
 * Generator for rickety uneven bridges and elevated snow-covered walkways:
 * - Uneven wooden plank bridges spanning across snow dips and ravines
 * - Abandoned elevated glass gallery corridors with blown-in snow (as seen in Image 1)
 */
export class BridgeGenerator {
  private static woodMat = new MeshStandardMaterial({
    color: new Color('#3d2b1f'),
    roughness: 0.9,
    metalness: 0.05
  });

  private static plankMat = new MeshStandardMaterial({
    color: new Color('#523b2b'),
    roughness: 0.88,
    metalness: 0.05
  });

  private static snowMat = new MeshStandardMaterial({
    color: new Color('#f1f5f9'),
    roughness: 0.95,
    metalness: 0.02
  });

  private static concreteMat = new MeshStandardMaterial({
    color: new Color('#475569'),
    roughness: 0.85,
    metalness: 0.1
  });

  private static pillarCyanMat = new MeshStandardMaterial({
    color: new Color('#38bdf8'),
    roughness: 0.8,
    metalness: 0.05
  });

  /**
   * Creates an authentic rickety wooden bridge with uneven planks, support piles, and railings
   */
  public static createRicketyBridge(length: number = 24, width: number = 3.6, height: number = 2.8): Group {
    const bridge = new Group();
    bridge.name = 'RicketyWoodenBridge';

    // 1. Two primary longitudinal support timber beams
    const beamGeo = new BoxGeometry(0.25, 0.35, length);
    const leftBeam = new Mesh(beamGeo, this.woodMat);
    leftBeam.position.set(-width / 2 + 0.2, height, 0);
    bridge.add(leftBeam);

    const rightBeam = new Mesh(beamGeo, this.woodMat);
    rightBeam.position.set(width / 2 - 0.2, height, 0);
    bridge.add(rightBeam);

    // 2. Vertical support piles driven into the snow
    const pileCount = Math.floor(length / 5);
    const pileGeo = new BoxGeometry(0.24, height + 1.5, 0.24);

    for (let i = 0; i <= pileCount; i++) {
      const z = -length / 2 + (i / pileCount) * length;

      const leftPile = new Mesh(pileGeo, this.woodMat);
      leftPile.position.set(-width / 2 + 0.2, height / 2 - 0.5, z);
      leftPile.rotation.z = (Math.sin(i * 3) - 0.5) * 0.05; // slight uneven tilt
      bridge.add(leftPile);

      const rightPile = new Mesh(pileGeo, this.woodMat);
      rightPile.position.set(width / 2 - 0.2, height / 2 - 0.5, z);
      rightPile.rotation.z = (Math.cos(i * 3) - 0.5) * 0.05;
      bridge.add(rightPile);

      // Cross-strut
      const crossStrut = new Mesh(new BoxGeometry(width, 0.18, 0.18), this.woodMat);
      crossStrut.position.set(0, height - 0.2, z);
      bridge.add(crossStrut);
    }

    // 3. Uneven transverse wooden planks
    const plankSpacing = 0.38;
    const plankCount = Math.floor(length / plankSpacing);
    const plankGeo = new BoxGeometry(width, 0.08, 0.32);

    for (let i = 0; i < plankCount; i++) {
      const z = -length / 2 + (i + 0.5) * plankSpacing;
      const plank = new Mesh(plankGeo, this.plankMat);

      // Unevenness: subtle height jitter, angle offset, and gaps
      const jitterY = (Math.sin(i * 1.7) * 0.02) + (Math.cos(i * 3.1) * 0.015);
      const jitterRotY = (Math.sin(i * 2.3) - 0.5) * 0.04;
      const jitterRotZ = (Math.cos(i * 1.9) - 0.5) * 0.03;

      plank.position.set(0, height + 0.2 + jitterY, z);
      plank.rotation.y = jitterRotY;
      plank.rotation.z = jitterRotZ;
      bridge.add(plank);

      // Random snow patches on some planks
      if (Math.sin(i * 4.2) > 0.4) {
        const patch = new Mesh(new BoxGeometry(width * 0.7, 0.04, 0.22), this.snowMat);
        patch.position.set((Math.sin(i) - 0.5) * 0.4, height + 0.25, z);
        bridge.add(patch);
      }
    }

    // 4. Rickety Railings & Posts
    const postGeo = new BoxGeometry(0.12, 1.1, 0.12);
    const postCount = Math.floor(length / 3);

    for (let i = 0; i <= postCount; i++) {
      const z = -length / 2 + (i / postCount) * length;

      // Left post
      const lp = new Mesh(postGeo, this.woodMat);
      lp.position.set(-width / 2 + 0.08, height + 0.7, z);
      lp.rotation.z = (Math.sin(i * 5) - 0.5) * 0.08;
      bridge.add(lp);

      // Right post
      const rp = new Mesh(postGeo, this.woodMat);
      rp.position.set(width / 2 - 0.08, height + 0.7, z);
      rp.rotation.z = (Math.cos(i * 5) - 0.5) * 0.08;
      bridge.add(rp);
    }

    // Top rails
    const railGeo = new BoxGeometry(0.12, 0.12, length);
    const leftRail = new Mesh(railGeo, this.woodMat);
    leftRail.position.set(-width / 2 + 0.08, height + 1.2, 0);
    bridge.add(leftRail);

    const leftRailSnow = new Mesh(new BoxGeometry(0.16, 0.06, length), this.snowMat);
    leftRailSnow.position.set(-width / 2 + 0.08, height + 1.28, 0);
    bridge.add(leftRailSnow);

    const rightRail = new Mesh(railGeo, this.woodMat);
    rightRail.position.set(width / 2 - 0.08, height + 1.2, 0);
    bridge.add(rightRail);

    const rightRailSnow = new Mesh(new BoxGeometry(0.16, 0.06, length), this.snowMat);
    rightRailSnow.position.set(width / 2 - 0.08, height + 1.28, 0);
    bridge.add(rightRailSnow);

    // 5. Inclined approach ramps at both ends
    const rampLength = 4.5;
    const rampGeo = new BoxGeometry(width, 0.1, rampLength);

    const rampSouth = new Mesh(rampGeo, this.plankMat);
    rampSouth.position.set(0, height / 2 + 0.1, length / 2 + rampLength / 2);
    rampSouth.rotation.x = -Math.atan2(height, rampLength);
    bridge.add(rampSouth);

    const rampNorth = new Mesh(rampGeo, this.plankMat);
    rampNorth.position.set(0, height / 2 + 0.1, -length / 2 - rampLength / 2);
    rampNorth.rotation.x = Math.atan2(height, rampLength);
    bridge.add(rampNorth);

    return bridge;
  }

  /**
   * Creates an abandoned glass gallery corridor on concrete pillars (as seen in Image 1):
   * Row of open window frames with blown-in snowdrifts and peeling paint pillars
   */
  public static createAbandonedGallery(length: number = 36, width: number = 4.5, height: number = 3.6): Group {
    const gallery = new Group();
    gallery.name = 'AbandonedGlassGallery';

    // Concrete base floor
    const floor = new Mesh(new BoxGeometry(width, 0.35, length), this.concreteMat);
    floor.position.set(0, 0.18, 0);
    gallery.add(floor);

    // Deep snow drifts blown into the hallway along windows
    const snowFloor = new Mesh(new BoxGeometry(width * 0.85, 0.22, length * 0.95), this.snowMat);
    snowFloor.position.set(-0.2, 0.35, 0);
    gallery.add(snowFloor);

    // Roof slab
    const roof = new Mesh(new BoxGeometry(width + 0.4, 0.35, length + 0.4), this.concreteMat);
    roof.position.set(0, height, 0);
    gallery.add(roof);

    // Snow layer on top of roof
    const roofSnow = new Mesh(new BoxGeometry(width + 0.5, 0.25, length + 0.5), this.snowMat);
    roofSnow.position.set(0, height + 0.25, 0);
    gallery.add(roofSnow);

    // Pillars and window frames along length
    const segmentLength = 3.6;
    const segmentCount = Math.floor(length / segmentLength);

    for (let i = 0; i < segmentCount; i++) {
      const z = -length / 2 + (i + 0.5) * segmentLength;

      // Cyan peeling pillar on right side
      const pillarRight = new Mesh(new BoxGeometry(0.45, height, 0.45), this.pillarCyanMat);
      pillarRight.position.set(width / 2 - 0.3, height / 2, z);
      gallery.add(pillarRight);

      // Window wall on left side (window frames facing courtyard)
      const windowFrameH = height * 0.65;
      const windowFrameY = height * 0.52;

      // Lower parapet
      const parapet = new Mesh(new BoxGeometry(0.3, height * 0.3, segmentLength), this.concreteMat);
      parapet.position.set(-width / 2 + 0.2, height * 0.15, z);
      gallery.add(parapet);

      // Snow drift banked on window sill
      const sillSnow = new Mesh(new BoxGeometry(0.45, 0.18, segmentLength * 0.9), this.snowMat);
      sillSnow.position.set(-width / 2 + 0.25, height * 0.35, z);
      gallery.add(sillSnow);

      // Vertical window mullions (wooden frames)
      const mullion = new Mesh(new BoxGeometry(0.12, windowFrameH, 0.12), this.woodMat);
      mullion.position.set(-width / 2 + 0.2, windowFrameY, z);
      gallery.add(mullion);

      // Transom bar
      const transom = new Mesh(new BoxGeometry(0.12, 0.12, segmentLength), this.woodMat);
      transom.position.set(-width / 2 + 0.2, height * 0.75, z);
      gallery.add(transom);
    }

    return gallery;
  }
}
