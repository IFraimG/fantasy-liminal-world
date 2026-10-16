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
  private eyeHeight = 1.7; // 1.7m eye level above ground

  // World position tracking
  public playerPos = new Vector3(0, 1.7, 0);

  // Rotation
  private euler = new Euler(0, 0, 0, 'YXZ');
  private mouseSensitivity = 0.0022;
  public isLocked = false;

  // Velocity & dampening
  private velocity = new Vector3();
  private direction = new Vector3();
  private keys: Record<string, boolean> = {};

  // Head bobbing
  private bobTime = 0;
  private totalDistance = 0;

  // Listener callbacks for React HUD
  private onStateChange?: (state: PlayerMovementState) => void;

  constructor(camera: Camera, domElement: HTMLElement, audioSystem: WinterAudioSystem) {
    this.camera = camera;
    this.domElement = domElement;
    this.audioSystem = audioSystem;

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
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.domElement.addEventListener('click', () => {
      this.requestLock();
      this.audioSystem.startWind();
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
    const forward = (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) - (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
    const side = (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) - (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);

    this.direction.set(side, 0, -forward);
    if (this.direction.lengthSq() > 0) {
      this.direction.normalize();
    }

    const isMoving = forward !== 0 || side !== 0;

    if (isMoving) {
      // Calculate world movement aligned with camera yaw
      const yaw = this.euler.y;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);

      const worldX = this.direction.x * cos - this.direction.z * sin;
      const worldZ = this.direction.x * sin + this.direction.z * cos;

      this.velocity.x = worldX * currentSpeed;
      this.velocity.z = worldZ * currentSpeed;

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
}
