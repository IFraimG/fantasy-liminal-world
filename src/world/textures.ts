import { CanvasTexture, RepeatWrapping, NearestFilter, LinearMipmapLinearFilter } from '@iwsdk/core';

/**
 * Procedural texture generator for authentic winter Soviet courtyard aesthetics.
 * Matches the user-provided photos:
 * - Fresh snow ground with ribbed vehicle tire treads and footpaths
 * - Modular Soviet panel building facade (хрущевка) with lit/unlit windows and snow on sills
 * - Concrete and asphalt with patches of packed snow
 */
export class ProceduralTextures {
  private static snowRoadTexture: CanvasTexture | null = null;
  private static buildingFacadeTexture: CanvasTexture | null = null;
  private static buildingNightLightTexture: CanvasTexture | null = null;
  private static concreteTexture: CanvasTexture | null = null;

  /**
   * Generates a snow ground texture with tire treads (следы шин / протекторы)
   */
  public static getSnowRoadTexture(): CanvasTexture {
    if (this.snowRoadTexture) return this.snowRoadTexture;

    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 1. Base snow gradient & noise (cool winter white with subtle blue-gray shadows)
    ctx.fillStyle = '#dde5ee';
    ctx.fillRect(0, 0, size, size);

    // Micro-noise for powdery snow sparkle
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 22;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise + 2));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise + 6));
    }
    ctx.putImageData(imgData, 0, 0);

    // 2. Road tire tracks (two parallel ruts with chevron/ribbed treads)
    const trackCenters = [size * 0.35, size * 0.65];
    const trackWidth = size * 0.14;

    trackCenters.forEach((cx) => {
      // Depressed rut shadow
      const grad = ctx.createLinearGradient(cx - trackWidth / 2, 0, cx + trackWidth / 2, 0);
      grad.addColorStop(0, 'rgba(150, 165, 185, 0.45)');
      grad.addColorStop(0.2, 'rgba(120, 135, 155, 0.7)');
      grad.addColorStop(0.5, 'rgba(105, 120, 140, 0.85)');
      grad.addColorStop(0.8, 'rgba(120, 135, 155, 0.7)');
      grad.addColorStop(1, 'rgba(150, 165, 185, 0.45)');

      ctx.fillStyle = grad;
      ctx.fillRect(cx - trackWidth / 2, 0, trackWidth, size);

      // Tread ribs (поперечные насечки протектора)
      ctx.fillStyle = 'rgba(75, 90, 110, 0.5)';
      const step = 14;
      for (let y = 0; y < size; y += step) {
        ctx.beginPath();
        // Chevron pattern
        ctx.moveTo(cx - trackWidth * 0.45, y);
        ctx.lineTo(cx, y + step * 0.5);
        ctx.lineTo(cx + trackWidth * 0.45, y);
        ctx.lineTo(cx + trackWidth * 0.45, y + 4);
        ctx.lineTo(cx, y + step * 0.5 + 4);
        ctx.lineTo(cx - trackWidth * 0.45, y + 4);
        ctx.closePath();
        ctx.fill();
      }

      // High-contrast snow ridges on rut edges
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillRect(cx - trackWidth / 2 - 4, 0, 4, size);
      ctx.fillRect(cx + trackWidth / 2, 0, 4, size);
    });

    // 3. Random human footstep depressions (следы пешеходов)
    ctx.fillStyle = 'rgba(130, 145, 165, 0.55)';
    for (let y = 20; y < size; y += 45) {
      const footX = size * 0.15 + (Math.sin(y * 0.1) * 20);
      const isLeft = (y / 45) % 2 === 0;
      const x = footX + (isLeft ? -10 : 10);
      
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 14, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.generateMipmaps = true;
    texture.minFilter = LinearMipmapLinearFilter;
    this.snowRoadTexture = texture;
    return texture;
  }

  /**
   * Generates Soviet panel building facade texture (панельная хрущевка)
   */
  public static getBuildingFacadeTexture(): CanvasTexture {
    if (this.buildingFacadeTexture) return this.buildingFacadeTexture;

    const width = 1024;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Concrete panel base color (grayish Soviet prefabricated concrete)
    ctx.fillStyle = '#b4b9be';
    ctx.fillRect(0, 0, width, height);

    // Weathering / concrete grunge
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const floors = 5;
    const columns = 6;
    const floorH = height / floors;
    const colW = width / columns;

    // Panel seams (швы между бетонными плитами)
    ctx.strokeStyle = '#5a5e62';
    ctx.lineWidth = 4;
    for (let f = 0; f <= floors; f++) {
      ctx.beginPath();
      ctx.moveTo(0, f * floorH);
      ctx.lineTo(width, f * floorH);
      ctx.stroke();
    }
    for (let c = 0; c <= columns; c++) {
      ctx.beginPath();
      ctx.moveTo(c * colW, 0);
      ctx.lineTo(c * colW, height);
      ctx.stroke();
    }

    // Windows
    const winMarginX = colW * 0.22;
    const winMarginY = floorH * 0.22;
    const winW = colW - winMarginX * 2;
    const winH = floorH - winMarginY * 2;

    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < columns; c++) {
        const wx = c * colW + winMarginX;
        const wy = f * floorH + winMarginY;

        // Window frame
        ctx.fillStyle = '#dbe0e4';
        ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4);

        // Snow buildup on window sill and upper frame
        ctx.fillStyle = '#f0f4f8';
        ctx.fillRect(wx - 3, wy - 5, winW + 6, 5);
        ctx.fillRect(wx - 2, wy + winH, winW + 4, 4);

        // Glass pane base
        const isLit = (f * 7 + c * 13) % 3 === 0;
        if (isLit) {
          // Warm interior light with blinds/curtains
          const warmColors = ['#ffc864', '#ffa432', '#ffe6a0', '#90c8ff'];
          const lightCol = warmColors[(f + c) % warmColors.length];
          ctx.fillStyle = lightCol;
          ctx.fillRect(wx, wy, winW, winH);

          // Curtain silhouette
          ctx.fillStyle = 'rgba(40, 30, 20, 0.4)';
          ctx.fillRect(wx, wy, winW * 0.3, winH);
          ctx.fillRect(wx + winW * 0.75, wy, winW * 0.25, winH);
        } else {
          // Dark glass reflecting cold night sky
          ctx.fillStyle = '#1c222c';
          ctx.fillRect(wx, wy, winW, winH);
        }

        // Window cross divider (створки окна)
        ctx.fillStyle = '#484e56';
        ctx.fillRect(wx + winW * 0.6, wy, 2, winH);
        ctx.fillRect(wx, wy + winH * 0.35, winW * 0.6, 2);

        // Water/dirt runoff streak under window
        ctx.fillStyle = 'rgba(60, 64, 70, 0.25)';
        ctx.fillRect(wx + winW * 0.1, wy + winH + 4, winW * 0.8, floorH * 0.15);
      }
    }

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = LinearMipmapLinearFilter;
    this.buildingFacadeTexture = texture;
    return texture;
  }

  /**
   * Concrete ground / curb texture
   */
  public static getConcreteTexture(): CanvasTexture {
    if (this.concreteTexture) return this.concreteTexture;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#6e747c';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 40;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    this.concreteTexture = texture;
    return texture;
  }
}
