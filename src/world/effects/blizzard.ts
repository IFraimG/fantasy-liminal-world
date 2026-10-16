import {
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
  Color
} from '@iwsdk/core';

export class BlizzardSystem {
  private particles: Points;
  private geometry: BufferGeometry;
  private particleCount = 4500;
  private velocities: Float32Array;
  private boxSize = 70; // 70m cube around player

  public intensity = 1.0; // 0.0 to 2.5
  public windDirection = new Vector3(1.2, -0.4, 0.6);

  constructor(scene: Scene) {
    const positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.boxSize;
      positions[i * 3 + 1] = Math.random() * this.boxSize;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.boxSize;

      // Random speed variations
      this.velocities[i * 3] = (Math.random() * 0.4 + 0.8);
      this.velocities[i * 3 + 1] = (Math.random() * 0.5 + 0.8);
      this.velocities[i * 3 + 2] = (Math.random() * 0.4 + 0.8);
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const material = new PointsMaterial({
      color: new Color('#f0f5fc'),
      size: 0.18,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.particles = new Points(this.geometry, material);
    scene.add(this.particles);
  }

  public update(delta: number, playerPosition: Vector3): void {
    const posAttr = this.geometry.attributes.position as Float32BufferAttribute;
    const array = posAttr.array as Float32Array;

    const windX = this.windDirection.x * (8.0 + Math.sin(Date.now() * 0.001) * 3.0) * this.intensity;
    const fallSpeed = 4.5 * this.intensity;
    const windZ = this.windDirection.z * 5.0 * this.intensity;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      // Move particle
      array[idx] += (windX * this.velocities[idx] + (Math.sin(array[idx + 1] * 0.2) * 0.5)) * delta;
      array[idx + 1] -= (fallSpeed * this.velocities[idx + 1]) * delta;
      array[idx + 2] += (windZ * this.velocities[idx + 2]) * delta;

      // Wrap around player position
      const dx = array[idx] - playerPosition.x;
      const dy = array[idx + 1] - playerPosition.y;
      const dz = array[idx + 2] - playerPosition.z;

      const half = this.boxSize / 2;
      if (dx > half) array[idx] -= this.boxSize;
      if (dx < -half) array[idx] += this.boxSize;
      if (dy > this.boxSize) array[idx + 1] -= this.boxSize;
      if (dy < 0) array[idx + 1] += this.boxSize;
      if (dz > half) array[idx + 2] -= this.boxSize;
      if (dz < -half) array[idx + 2] += this.boxSize;
    }

    posAttr.needsUpdate = true;
  }

  public setIntensity(val: number): void {
    this.intensity = Math.max(0.1, Math.min(3.0, val));
    const mat = this.particles.material as PointsMaterial;
    mat.opacity = Math.min(0.95, 0.4 + this.intensity * 0.35);
    mat.size = 0.12 + this.intensity * 0.08;
  }
}
