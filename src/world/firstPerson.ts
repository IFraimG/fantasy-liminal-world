import { Camera, Vector3, Euler } from '@iwsdk/core';
import { WinterAudioSystem } from './effects/audio.js';
import { TerrainElevation } from './procedural/terrain.js';
import { CollisionSystem } from './collision/collisionSystem.js';

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
  private eyeHeight = 2.12; // elevated above the ibis head for clear first-person view
  public groundY = 0; // terrain elevation at player position

  // World position tracking
  public playerPos = new Vector3(0, 0, 0);

  // Rotation
  private euler = new Euler(0, 0, 0, 'YXZ');
  private mouseSensitivity = 0.0022;
  public isLocked = false;

  // 3rd-person front selfie inspection mode (Key '5')
  public isThirdPersonFront = false;

  // Velocity & dampening
  private velocity = new Vector3();
  private direction = new Vector3();
  private keys: Record<string, boolean> = {};

  // Movement orientation & key mappings (relative to camera look direction)
  public keyMapping: 'user_custom' | 'classic' = 'classic';
  public moveOrientation: 'fixed_world' | 'camera' = 'camera';

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

    this.groundY = TerrainElevation.getHeight(0, 0);
    this.playerPos.set(0, this.groundY, 0);
    this.camera.position.set(0, this.groundY + this.eyeHeight, 0);

    this.bindEvents();
  }

  public setOnStateChange(cb: (state: PlayerMovementState) => void): void {
    this.onStateChange = cb;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Digit5' || e.code === 'Numpad5' || e.key === '5') {
        this.isThirdPersonFront = true;
      }
      // Start audio on first keypress
      this.audioSystem.startWind();
      this.audioSystem.startBgm();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Digit5' || e.code === 'Numpad5' || e.key === '5') {
        this.isThirdPersonFront = false;
      }
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

      this.euler.y -= movementX * this.mouseSensitivity;
      this.euler.x -= movementY * this.mouseSensitivity;

      // Clamp vertical look angle
      const maxPitch = Math.PI / 2 - 0.08;
      this.euler.x = Math.max(-maxPitch, Math.min(maxPitch, this.euler.x));

      if (!this.isThirdPersonFront) {
        this.camera.quaternion.setFromEuler(this.euler);
      }
    });
  }

  public requestLock(): void {
    this.domElement.requestPointerLock?.();
  }

  public update(delta: number): void {
    const isRunning = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) === true;
    const currentSpeed = this.moveSpeed * (isRunning ? this.runMultiplier : 1.0);

    // Read directional inputs
    let moveZ = 0; // -1 is forward, +1 is backward
    let moveX = 0; // -1 is left, +1 is right

    if (this.keyMapping === 'classic') {
      // Classic gamer WASD: W - вперед, S - назад, A - влево, D - вправо
      if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
    } else {
      // User custom fallback
      if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
      if (this.keys['KeyA'] || this.keys['ArrowDown']) moveZ += 1;
      if (this.keys['KeyS'] || this.keys['ArrowLeft']) moveX -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
    }

    const isMoving = moveZ !== 0 || moveX !== 0;

    if (isMoving) {
      // Normalize combined inputs
      const inputLen = Math.hypot(moveX, moveZ);
      const normX = moveX / inputLen;
      const normZ = moveZ / inputLen;

      if (this.moveOrientation === 'camera') {
        // Dynamic horizontal movement based on where the player's camera is currently looking:
        // Turning camera with mouse while holding 'W' instantly redirects movement trajectory!
        const yaw = this.euler.y;
        const fwdX = -Math.sin(yaw);
        const fwdZ = -Math.cos(yaw);
        const rightX = Math.cos(yaw);
        const rightZ = -Math.sin(yaw);

        // normZ: -1 is forward (W), +1 is backward (S)
        // normX: -1 is left (A), +1 is right (D)
        this.tempMoveVec.x = (-normZ * fwdX) + (normX * rightX);
        this.tempMoveVec.z = (-normZ * fwdZ) + (normX * rightZ);
        this.tempMoveVec.y = 0;
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

      const desiredX = this.playerPos.x + this.velocity.x * delta;
      const desiredZ = this.playerPos.z + this.velocity.z * delta;

      // Solid collision resolution (cannot clip through building walls, garages, or obstacles)
      const resolved = CollisionSystem.resolveMovement(
        this.playerPos,
        new Vector3(desiredX, this.groundY, desiredZ),
        this.groundY
      );

      this.playerPos.x = resolved.x;
      this.playerPos.z = resolved.z;
    } else {
      // Dampen velocity when stopped
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
    }

    // Snap ground height smoothly to terrain elevation or indoor floor/stairs
    const outdoorTerrainY = TerrainElevation.getHeight(this.playerPos.x, this.playerPos.z);
    const targetGroundY = CollisionSystem.getPlayerGroundY(
      this.playerPos.x,
      this.playerPos.z,
      this.groundY,
      outdoorTerrainY
    );
    this.groundY += (targetGroundY - this.groundY) * Math.min(1.0, delta * 14.0);
    this.playerPos.y = this.groundY;

    // Camera placement: 3rd-person front selfie inspection (key '5') OR 1st-person above head
    if (this.isThirdPersonFront) {
      // Position camera 2.9m directly in front of the ibis, looking back at the full body
      const yaw = this.euler.y;
      const frontDist = 2.9;
      const camX = this.playerPos.x - Math.sin(yaw) * frontDist;
      const camZ = this.playerPos.z - Math.cos(yaw) * frontDist;
      const frontGroundY = TerrainElevation.getHeight(camX, camZ);
      const camY = Math.max(frontGroundY + 0.6, this.groundY + 1.15);

      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(this.playerPos.x, this.groundY + 1.15, this.playerPos.z);
    } else {
      // Normal 1st-person view directly above the ibis head
      const bobY = isMoving ? Math.sin(this.bobTime) * (isRunning ? 0.05 : 0.025) : 0;
      this.camera.position.set(
        this.playerPos.x,
        this.groundY + this.eyeHeight + bobY,
        this.playerPos.z
      );
      this.camera.quaternion.setFromEuler(this.euler);
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
    const gy = TerrainElevation.getHeight(x, z);
    this.groundY = gy;
    this.playerPos.set(x, gy, z);
    this.camera.position.set(x, gy + this.eyeHeight, z);
  }

  public setKeyMapping(mapping: 'user_custom' | 'classic'): void {
    this.keyMapping = mapping;
  }

  public setMoveOrientation(orientation: 'fixed_world' | 'camera'): void {
    this.moveOrientation = orientation;
  }

  public setThirdPersonFront(active: boolean): void {
    this.isThirdPersonFront = active;
  }

  public getPitch(): number {
    return this.euler.x;
  }

  public getYaw(): number {
    return this.euler.y;
  }
}


