/**
 * Continuous procedural terrain elevation function:
 * - Rolling snowy hills (сопки)
 * - Snow gullies, ravines, and dunes
 * - Flattens gently around player spawn (0, 0)
 * - Deterministic: identical (x, z) coordinates always return the exact same height
 */
export class TerrainElevation {
  /**
   * Returns continuous ground height at world coordinates (x, z)
   */
  public static getHeight(x: number, z: number): number {
    const distFromOrigin = Math.hypot(x, z);
    // Smooth transition from flat spawn courtyard (r < 30m) into rolling hills
    const hillWeight = Math.min(1.0, Math.max(0.0, (distFromOrigin - 25) / 45));

    if (hillWeight <= 0) {
      return 0;
    }

    // Octave 1: Grand rolling hills / сопки (wavelength ~120m, height ~6m)
    const macroHills = Math.sin(x * 0.014 + 0.3) * Math.cos(z * 0.012 + 0.5) * 6.5;

    // Octave 2: Secondary ridges and gullies (wavelength ~50m, height ~3m)
    const mediumRidges = Math.sin((x * 0.028 - z * 0.022) + 1.2) * 3.2;

    // Octave 3: Uneven snow mounds and dips (wavelength ~22m, height ~1.2m)
    const snowWaves = Math.cos(x * 0.065 + z * 0.055) * Math.sin(z * 0.075) * 1.4;

    // Octave 4: Micro roughness for snowy texture (height ~0.4m)
    const micro = Math.sin(x * 0.15) * Math.cos(z * 0.15) * 0.35;

    const rawHeight = macroHills + mediumRidges + snowWaves + micro;

    return rawHeight * hillWeight;
  }
}
