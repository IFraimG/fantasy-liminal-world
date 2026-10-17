import {
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
  Color,
  CanvasTexture
} from '@iwsdk/core';

export class BlizzardSystem {
  private particles: Points;
  private geometry: BufferGeometry;
  private particleCount = 4800;
  private velocities: Float32Array;
  private boxSize = 65; // 65m horizontal span around player
  private verticalSpan = 40; // 40m vertical span around player

  public intensity = 1.0; // 0.0 to 2.5
  public windDirection = new Vector3(1.2, -0.4, 0.6);

  constructor(scene: Scene) {
    const positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.boxSize;
      positions[i * 3 + 1] = Math.random() * this.verticalSpan;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.boxSize;

      // Random fall and drift speeds
      this.velocities[i * 3] = Math.random() * 0.4 + 0.8;
      this.velocities[i * 3 + 1] = Math.random() * 0.5 + 0.8;
      this.velocities[i * 3 + 2] = Math.random() * 0.4 + 0.8;
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    // Circular soft snowflake texture
    const snowflakeTexture = this.createSnowflakeTexture();

    const material = new PointsMaterial({
      color: new Color('#f8fafc'),
      size: 0.22,
      map: snowflakeTexture,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

    this.particles = new Points(this.geometry, material);

    // CRITICAL FIX: Disable frustum culling so particles NEVER disappear when looking away from world origin!
    this.particles.frustumCulled = false;

    scene.add(this.particles);
  }

  private createSnowflakeTexture(): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.35, 'rgba(240, 246, 255, 0.85)');
    grad.addColorStop(0.7, 'rgba(220, 235, 255, 0.35)');
    grad.addColorStop(1.0, 'rgba(220, 235, 255, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new CanvasTexture(canvas);
    return texture;
  }

  public update(delta: number, playerPosition: Vector3): void {
    const posAttr = this.geometry.attributes.position as Float32BufferAttribute;
    const array = posAttr.array as Float32Array;

    const windX = this.windDirection.x * (7.5 + Math.sin(Date.now() * 0.001) * 3.0) * this.intensity;
    const fallSpeed = 4.2 * this.intensity;
    const windZ = this.windDirection.z * 5.0 * this.intensity;

    const halfBox = this.boxSize / 2;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      // Swirling drift
      const flutter = Math.sin(array[idx + 1] * 0.3 + i) * 0.6;

      array[idx] += (windX * this.velocities[idx] + flutter) * delta;
      array[idx + 1] -= (fallSpeed * this.velocities[idx + 1]) * delta;
      array[idx + 2] += (windZ * this.velocities[idx + 2] + flutter * 0.5) * delta;

      // Wrap horizontally around current player position
      const dx = array[idx] - playerPosition.x;
      const dz = array[idx + 2] - playerPosition.z;

      if (dx > halfBox) array[idx] -= this.boxSize;
      if (dx < -halfBox) array[idx] += this.boxSize;
      if (dz > halfBox) array[idx + 2] -= this.boxSize;
      if (dz < -halfBox) array[idx + 2] += this.boxSize;

      // Wrap vertically around player position:
      // Keep snow falling from +30m above player down to -6m below player (covering ground and feet)
      const dy = array[idx + 1] - playerPosition.y;
      if (dy > 30) array[idx + 1] -= this.verticalSpan;
      if (dy < -6) array[idx + 1] += this.verticalSpan;
    }

    posAttr.needsUpdate = true;
  }

  public setIntensity(val: number): void {
    this.intensity = Math.max(0.1, Math.min(3.0, val));
    const mat = this.particles.material as PointsMaterial;
    mat.opacity = Math.min(0.95, 0.45 + this.intensity * 0.35);
    mat.size = 0.16 + this.intensity * 0.08;
  }
}
