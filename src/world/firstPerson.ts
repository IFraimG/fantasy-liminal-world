import { Camera, Vector3, Euler } from '@iwsdk/core';
import { WinterAudioSystem } from './effects/audio.js';

export interface PlayerMovementState {
  position: Vector3;
  headingDeg: number;
  speed: number;
  distanceTraveled: number;
  isMoving: boolean;
  isRunning: boolean;
}

export class FirstPersonController {
  private camera: Camera;
  private domElement: HTMLElement;
  private audioSystem: WinterAudioSystem;

  // Movement parameters
  private moveSpeed = 4.5; // m/s walking in snow
  private runMultiplier = 1.75; // running in snow
  private eyeHeight = 1.76; // on the level of the ibis head/eyes

  // World position tracking
  public playerPos = new Vector3(0, 1.76, 0);

  // Rotation
  private euler = new Euler(0, 0, 0, 'YXZ');
  private mouseSensitivity = 0.0022;
  public isLocked = false;

  // Velocity & dampening
  private velocity = new Vector3();
  private direction = new Vector3();
  private keys: Record<string, boolean> = {};

  // Movement orientation & key mappings
  public keyMapping: 'user_custom' | 'classic' = 'user_custom';
  public moveOrientation: 'fixed_world' | 'camera' = 'fixed_world';

  // Pre-allocated vectors to avoid per-frame allocations
  private tempCamDir = new Vector3();
  private tempCamRight = new Vector3();
  private tempMoveVec = new Vector3();

  // Head bobbing
  private bobTime = 0;
  private totalDistance = 0;

  // Listener callbacks for React HUD
  private onStateChange?: (state: PlayerMovementState) => void;

  constructor(camera: Camera, domElement: HTMLElement, audioSystem: WinterAudioSystem) {
    this.camera = camera;
    this.domElement = domElement;
    this.audioSystem = audioSystem;

    // Adjust camera near plane so ibis beak and skin are clearly visible when looking down
    if ('near' in camera) {
      (camera as unknown as { near: number; updateProjectionMatrix: () => void }).near = 0.05;
      (camera as unknown as { near: number; updateProjectionMatrix: () => void }).updateProjectionMatrix();
    }

    this.playerPos.set(0, this.eyeHeight, 0);
    this.camera.position.copy(this.playerPos);

    this.bindEvents();
  }

  public setOnStateChange(cb: (state: PlayerMovementState) => void): void {
    this.onStateChange = cb;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      // Start audio on first keypress
      this.audioSystem.startWind();
      this.audioSystem.startBgm();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.domElement.addEventListener('click', () => {
      this.requestLock();
      this.audioSystem.startWind();
      this.audioSystem.startBgm();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;

      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;

      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= movementX * this.mouseSensitivity;
      this.euler.x -= movementY * this.mouseSensitivity;

      // Clamp vertical look angle
      const maxPitch = Math.PI / 2 - 0.08;
      this.euler.x = Math.max(-maxPitch, Math.min(maxPitch, this.euler.x));

      this.camera.quaternion.setFromEuler(this.euler);
    });
  }

  public requestLock(): void {
    this.domElement.requestPointerLock?.();
  }

  public update(delta: number): void {
    const isRunning = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) === true;
    const currentSpeed = this.moveSpeed * (isRunning ? this.runMultiplier : 1.0);

    // Read directional inputs
    let moveZ = 0; // -1 is forward (North), +1 is backward (South)
    let moveX = 0; // -1 is left (West), +1 is right (East)

    if (this.keyMapping === 'user_custom') {
      // User-requested mapping: W - вперед, A - назад, S - влево, D - вправо
      if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
      if (this.keys['KeyA'] || this.keys['ArrowDown']) moveZ += 1;
      if (this.keys['KeyS'] || this.keys['ArrowLeft']) moveX -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
    } else {
      // Classic WASD: W - вперед, S - назад, A - влево, D - вправо
      if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
    }

    const isMoving = moveZ !== 0 || moveX !== 0;

    if (isMoving) {
      // Normalize combined inputs
      const inputLen = Math.hypot(moveX, moveZ);
      const normX = moveX / inputLen;
      const normZ = moveZ / inputLen;

      if (this.moveOrientation === 'camera') {
        // Move relative to where camera is facing
        this.camera.getWorldDirection(this.tempCamDir);
        this.tempCamDir.y = 0;
        this.tempCamDir.normalize();

        this.tempCamRight.crossVectors(this.tempCamDir, this.camera.up).normalize();

        // normZ: -1 is forward, +1 is backward
        // normX: -1 is left, +1 is right
        this.tempMoveVec.set(0, 0, 0)
          .addScaledVector(this.tempCamDir, -normZ)
          .addScaledVector(this.tempCamRight, normX);
      } else {
        // Fixed world coordinates: each key moves in its specific cardinal direction
        this.tempMoveVec.set(normX, 0, normZ);
      }

      this.velocity.x = this.tempMoveVec.x * currentSpeed;
      this.velocity.z = this.tempMoveVec.z * currentSpeed;

      const stepDist = currentSpeed * delta;
      this.totalDistance += stepDist;

      // Footstep crunch audio
      this.audioSystem.playSnowFootstep(isRunning);

      // Head bobbing calculation
      const bobFreq = isRunning ? 13 : 8.5;
      this.bobTime += delta * bobFreq;
      const bobY = Math.sin(this.bobTime) * (isRunning ? 0.05 : 0.025);

      this.playerPos.x += this.velocity.x * delta;
      this.playerPos.z += this.velocity.z * delta;

      this.camera.position.set(
        this.playerPos.x,
        this.eyeHeight + bobY,
        this.playerPos.z
      );
    } else {
      // Dampen velocity when stopped
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
      this.camera.position.set(
        this.playerPos.x,
        this.eyeHeight,
        this.playerPos.z
      );
    }

    // Heading calculation (0 to 360 degrees)
    let heading = (-this.euler.y * (180 / Math.PI)) % 360;
    if (heading < 0) heading += 360;

    if (this.onStateChange) {
      this.onStateChange({
        position: this.playerPos.clone(),
        headingDeg: Math.round(heading),
        speed: isMoving ? currentSpeed : 0,
        distanceTraveled: Math.round(this.totalDistance),
        isMoving,
        isRunning
      });
    }
  }

  public teleport(x: number, z: number): void {
    this.playerPos.x = x;
    this.playerPos.z = z;
    this.camera.position.set(x, this.eyeHeight, z);
  }

  public setKeyMapping(mapping: 'user_custom' | 'classic'): void {
    this.keyMapping = mapping;
  }

  public setMoveOrientation(orientation: 'fixed_world' | 'camera'): void {
    this.moveOrientation = orientation;
  }

  public getPitch(): number {
    return this.euler.x;
  }

  public getYaw(): number {
    return this.euler.y;
  }
}


