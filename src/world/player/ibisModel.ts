import {
  Group,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  Color
} from '@iwsdk/core';

/**
 * Procedural Minecraft/Voxel style Scarlet Ibis (Красный Ибис) 3D player avatar.
 * Features:
 * - Voxel scarlet body with folded wings and black tail feathers
 * - Graceful voxel neck and head with pixel eyes
 * - Long curved ibis beak clearly visible in front of the camera
 * - Long red legs with animated walking gait
 * - Seamless first-person view: looking down shows body, wings, and legs
 */
export class IbisPlayerModel {
  public root: Group;

  // Animatable sub-nodes
  private headGroup: Group;
  private beakGroup: Group;
  private bodyGroup: Group;
  private leftLegGroup: Group;
  private rightLegGroup: Group;

  private walkTime = 0;

  constructor() {
    this.root = new Group();
    this.root.name = 'IbisPlayerModel';

    // Shaded scarlet red materials for voxel plumage
    const matRedPrimary = new MeshStandardMaterial({
      color: new Color('#d43538'),
      roughness: 0.82,
      metalness: 0.05
    });

    const matRedDark = new MeshStandardMaterial({
      color: new Color('#b32326'),
      roughness: 0.85,
      metalness: 0.05
    });

    const matRedBright = new MeshStandardMaterial({
      color: new Color('#ea4649'),
      roughness: 0.80,
      metalness: 0.05
    });

    const matTailBlack = new MeshStandardMaterial({
      color: new Color('#1c1917'),
      roughness: 0.9,
      metalness: 0.1
    });

    const matBeak = new MeshStandardMaterial({
      color: new Color('#8e3c3e'),
      roughness: 0.65,
      metalness: 0.15
    });

    const matLegs = new MeshStandardMaterial({
      color: new Color('#bf3235'),
      roughness: 0.75,
      metalness: 0.05
    });

    const matEyeBlack = new MeshStandardMaterial({
      color: new Color('#0a0a0c'),
      roughness: 0.3
    });

    const matEyeWhite = new MeshStandardMaterial({
      color: new Color('#ffffff'),
      roughness: 0.2
    });

    // -------------------------------------------------------------
    // 1. LEGS (From ground y=0 up to body base y=0.82)
    // -------------------------------------------------------------
    const legHeight = 0.82;
    const legThickness = 0.065;

    // Left leg
    this.leftLegGroup = new Group();
    this.leftLegGroup.position.set(-0.11, legHeight, 0.02);

    const leftLegMesh = new Mesh(
      new BoxGeometry(legThickness, legHeight, legThickness),
      matLegs
    );
    leftLegMesh.position.y = -legHeight / 2;
    this.leftLegGroup.add(leftLegMesh);

    // Left Foot / Toes
    const leftFoot = new Mesh(new BoxGeometry(0.14, 0.04, 0.22), matLegs);
    leftFoot.position.set(0, -legHeight + 0.02, -0.06);
    this.leftLegGroup.add(leftFoot);
    this.root.add(this.leftLegGroup);

    // Right leg
    this.rightLegGroup = new Group();
    this.rightLegGroup.position.set(0.11, legHeight, 0.02);

    const rightLegMesh = new Mesh(
      new BoxGeometry(legThickness, legHeight, legThickness),
      matLegs
    );
    rightLegMesh.position.y = -legHeight / 2;
    this.rightLegGroup.add(rightLegMesh);

    // Right Foot / Toes
    const rightFoot = new Mesh(new BoxGeometry(0.14, 0.04, 0.22), matLegs);
    rightFoot.position.set(0, -legHeight + 0.02, -0.06);
    this.rightLegGroup.add(rightFoot);
    this.root.add(this.rightLegGroup);

    // -------------------------------------------------------------
    // 2. BODY & TORSO (y = 0.82 to 1.25)
    // -------------------------------------------------------------
    this.bodyGroup = new Group();
    this.bodyGroup.position.set(0, 0.98, 0.05);

    // Main torso box (tilted slightly up in front)
    const torsoMesh = new Mesh(
      new BoxGeometry(0.42, 0.38, 0.58),
      matRedPrimary
    );
    torsoMesh.rotation.x = -0.15; // tilted bird posture
    this.bodyGroup.add(torsoMesh);

    // Chest plumage accent
    const chestMesh = new Mesh(
      new BoxGeometry(0.36, 0.32, 0.16),
      matRedBright
    );
    chestMesh.position.set(0, 0.04, -0.28);
    chestMesh.rotation.x = -0.2;
    this.bodyGroup.add(chestMesh);

    // Left Wing
    const leftWing = new Mesh(
      new BoxGeometry(0.065, 0.34, 0.52),
      matRedDark
    );
    leftWing.position.set(-0.23, 0.02, 0.02);
    leftWing.rotation.x = -0.15;
    leftWing.rotation.z = 0.06;
    this.bodyGroup.add(leftWing);

    // Right Wing
    const rightWing = new Mesh(
      new BoxGeometry(0.065, 0.34, 0.52),
      matRedDark
    );
    rightWing.position.set(0.23, 0.02, 0.02);
    rightWing.rotation.x = -0.15;
    rightWing.rotation.z = -0.06;
    this.bodyGroup.add(rightWing);

    // Black Tail feathers (angled backwards)
    const tailMesh = new Mesh(
      new BoxGeometry(0.28, 0.18, 0.32),
      matTailBlack
    );
    tailMesh.position.set(0, -0.04, 0.38);
    tailMesh.rotation.x = -0.35;
    this.bodyGroup.add(tailMesh);

    this.root.add(this.bodyGroup);

    // -------------------------------------------------------------
    // 3. S-CURVED LONG NECK (Rising from y = 1.15 to y = 1.65)
    // -------------------------------------------------------------
    const neckGroup = new Group();
    neckGroup.position.set(0, 1.14, -0.22);

    // Lower neck
    const neckLower = new Mesh(
      new BoxGeometry(0.18, 0.28, 0.18),
      matRedPrimary
    );
    neckLower.position.set(0, 0.12, -0.04);
    neckLower.rotation.x = 0.35; // leans forward from chest
    neckGroup.add(neckLower);

    // Mid neck (curving upwards)
    const neckMid = new Mesh(
      new BoxGeometry(0.16, 0.32, 0.16),
      matRedBright
    );
    neckMid.position.set(0, 0.34, -0.08);
    neckMid.rotation.x = -0.15; // curves back upright
    neckGroup.add(neckMid);

    // Upper neck
    const neckUpper = new Mesh(
      new BoxGeometry(0.15, 0.26, 0.15),
      matRedPrimary
    );
    neckUpper.position.set(0, 0.56, -0.05);
    neckUpper.rotation.x = -0.32; // curves forward into head
    neckGroup.add(neckUpper);

    this.root.add(neckGroup);

    // -------------------------------------------------------------
    // 4. HEAD & EYES (At camera eye level ~ 1.72)
    // -------------------------------------------------------------
    this.headGroup = new Group();
    this.headGroup.position.set(0, 1.75, -0.12);

    const headMesh = new Mesh(
      new BoxGeometry(0.22, 0.22, 0.28),
      matRedPrimary
    );
    headMesh.position.set(0, 0, 0);
    this.headGroup.add(headMesh);

    // Left Eye
    const eyeLeftPupil = new Mesh(new BoxGeometry(0.04, 0.07, 0.07), matEyeBlack);
    eyeLeftPupil.position.set(-0.115, 0.03, -0.05);
    this.headGroup.add(eyeLeftPupil);

    const eyeLeftGlint = new Mesh(new BoxGeometry(0.042, 0.03, 0.03), matEyeWhite);
    eyeLeftGlint.position.set(-0.116, 0.045, -0.065);
    this.headGroup.add(eyeLeftGlint);

    // Right Eye
    const eyeRightPupil = new Mesh(new BoxGeometry(0.04, 0.07, 0.07), matEyeBlack);
    eyeRightPupil.position.set(0.115, 0.03, -0.05);
    this.headGroup.add(eyeRightPupil);

    const eyeRightGlint = new Mesh(new BoxGeometry(0.042, 0.03, 0.03), matEyeWhite);
    eyeRightGlint.position.set(0.116, 0.045, -0.065);
    this.headGroup.add(eyeRightGlint);

    // -------------------------------------------------------------
    // 5. LONG CURVED IBIS BEAK (Extending forward & curving down)
    // -------------------------------------------------------------
    this.beakGroup = new Group();
    this.beakGroup.position.set(0, -0.02, -0.14);

    // Beak segment 1 (base): thick, pointing slightly down
    const beakSeg1 = new Mesh(
      new BoxGeometry(0.11, 0.11, 0.22),
      matBeak
    );
    beakSeg1.position.set(0, -0.02, -0.10);
    beakSeg1.rotation.x = 0.12;
    this.beakGroup.add(beakSeg1);

    // Beak segment 2 (mid): tapering, curving downward
    const beakSeg2 = new Mesh(
      new BoxGeometry(0.085, 0.085, 0.24),
      matBeak
    );
    beakSeg2.position.set(0, -0.09, -0.28);
    beakSeg2.rotation.x = 0.38;
    this.beakGroup.add(beakSeg2);

    // Beak segment 3 (tip): slender, curving sharply down
    const beakSeg3 = new Mesh(
      new BoxGeometry(0.06, 0.06, 0.24),
      matBeak
    );
    beakSeg3.position.set(0, -0.22, -0.44);
    beakSeg3.rotation.x = 0.68;
    this.beakGroup.add(beakSeg3);

    this.headGroup.add(this.beakGroup);
    this.root.add(this.headGroup);
  }

  /**
   * Updates animations and synchronizes head/beak pitch with camera look angle
   */
  public update(
    delta: number,
    isMoving: boolean,
    isRunning: boolean,
    cameraPitch: number
  ): void {
    // 1. Leg walking gait animation
    if (isMoving) {
      const walkSpeed = isRunning ? 14 : 9.5;
      this.walkTime += delta * walkSpeed;

      const legAngle = Math.sin(this.walkTime) * (isRunning ? 0.48 : 0.35);
      this.leftLegGroup.rotation.x = legAngle;
      this.rightLegGroup.rotation.x = -legAngle;

      // Slight natural body sway when walking
      this.bodyGroup.position.y = 0.98 + Math.abs(Math.sin(this.walkTime * 2)) * 0.035;
      this.bodyGroup.rotation.z = Math.sin(this.walkTime) * 0.03;
    } else {
      // Smoothly return legs to neutral standing position
      this.leftLegGroup.rotation.x *= 0.85;
      this.rightLegGroup.rotation.x *= 0.85;
      this.bodyGroup.position.y = 0.98;
      this.bodyGroup.rotation.z *= 0.85;
    }

    // 2. Pitch head & beak with camera look angle
    // So when user tilts head down, beak tilts down into view
    this.headGroup.rotation.x = cameraPitch * 0.72;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.root.position.set(x, y, z);
  }

  public setRotationY(yaw: number): void {
    this.root.rotation.y = yaw;
  }
}
