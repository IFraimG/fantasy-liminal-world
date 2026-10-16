import {
  World,
  FogExp2,
  AmbientLight,
  DirectionalLight,
  Color,
  PerspectiveCamera,
  Scene
} from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { ChunkManager } from './procedural/chunkManager.js';
import { BlizzardSystem } from './effects/blizzard.js';
import { WinterAudioSystem } from './effects/audio.js';
import { FirstPersonController, PlayerMovementState } from './firstPerson.js';
import { ProceduralTextures } from './textures.js';

export interface WorldMetrics {
  playerPosition: { x: number; y: number; z: number };
  activeChunks: number;
  totalBuildings: number;
  totalLamps: number;
  currentChunk: string;
  fps: number;
  drawCalls: number;
}

export class SnowWorldEngine {
  private static instance: SnowWorldEngine | null = null;

  public world!: World;
  public chunkManager!: ChunkManager;
  public blizzardSystem!: BlizzardSystem;
  public audioSystem!: WinterAudioSystem;
  public controller!: FirstPersonController;

  private isRunning = false;
  private lastTime = performance.now();
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private currentFps = 60;

  private stateListeners: ((state: PlayerMovementState) => void)[] = [];
  private metricsListeners: ((metrics: WorldMetrics) => void)[] = [];

  public static getInstance(): SnowWorldEngine {
    if (!this.instance) {
      this.instance = new SnowWorldEngine();
    }
    return this.instance;
  }

  /**
   * Initializes the engine with progressive step-by-step loading and shader warmup
   */
  public async init(
    container: HTMLElement,
    onProgress?: (percent: number, status: string) => void
  ): Promise<void> {
    if (this.world) return;

    // Stage 1: IWSDK World Init (0 - 25%)
    onProgress?.(15, 'Инициализация 3D-движка IWSDK...');
    this.world = await World.create(container, projectOptions);

    const scene = this.world.scene;
    const camera = this.world.camera;

    // Attach camera directly to scene root so it stays firmly on ground
    scene.add(camera);
    camera.position.set(0, 1.7, 0);
    if (this.world.player) {
      this.world.player.position.set(0, 0, 0);
    }

    // Stage 2: Atmosphere & Procedural Textures (25% - 50%)
    onProgress?.(35, 'Синтез текстур снега и панельных фасадов...');
    scene.background = new Color('#0a0e17');
    scene.fog = new FogExp2('#0e1422', 0.010);

    // Optimized lighting: 1 ambient + 1 moon light
    const ambient = new AmbientLight('#22324f', 0.85);
    scene.add(ambient);

    const moon = new DirectionalLight('#2e4268', 0.45);
    moon.position.set(40, 80, 20);
    scene.add(moon);

    // Warm up procedural textures
    ProceduralTextures.getSnowRoadTexture();
    ProceduralTextures.getBuildingFacadeTexture();

    // Stage 3: Initial Chunks Prewarm (50% - 75%)
    onProgress?.(60, 'Построение жилого массива и фонарей...');
    this.chunkManager = new ChunkManager(scene);
    this.chunkManager.prewarm(camera.position);

    // Stage 4: Blizzard particles & audio (75% - 90%)
    onProgress?.(80, 'Инициализация системы метели и звука...');
    this.audioSystem = new WinterAudioSystem();
    this.blizzardSystem = new BlizzardSystem(scene);

    // Stage 5: First Person Controller & Shader Compilation (90% - 100%)
    onProgress?.(92, 'Компиляция WebGL шейдеров и кэширование...');
    this.controller = new FirstPersonController(camera, container, this.audioSystem);
    this.controller.setOnStateChange((state) => {
      this.stateListeners.forEach((cb) => cb(state));
    });

    // Compile all shaders in advance so first render has 0 lag!
    if (this.world.renderer && this.world.renderer.compile) {
      this.world.renderer.compile(scene, camera);
    }

    // Small delay to let GPU settle
    await new Promise((res) => setTimeout(res, 250));

    onProgress?.(100, 'Готово к исследованию');

    // 6. Start Render & Update Loop
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.loop);

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // FPS calculation
    this.frameCount++;
    if (now - this.lastFpsTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
      this.notifyMetrics();
    }

    // Update First Person movement
    this.controller.update(delta);

    const playerPos = this.controller.playerPos;

    // Expand / generate chunks as player walks
    this.chunkManager.update(playerPos);

    // Update swirling blizzard particles around player
    this.blizzardSystem.update(delta, playerPos);
  };

  private notifyMetrics(): void {
    if (this.metricsListeners.length === 0) return;
    const pos = this.controller ? this.controller.playerPos : this.world.camera.position;
    const drawCalls = this.world.renderer.info.render.calls || 0;

    const metrics: WorldMetrics = {
      playerPosition: {
        x: Math.round(pos.x * 10) / 10,
        y: Math.round(pos.y * 10) / 10,
        z: Math.round(pos.z * 10) / 10
      },
      activeChunks: this.chunkManager.getActiveChunkCount(),
      totalBuildings: this.chunkManager.totalBuildingsGenerated,
      totalLamps: this.chunkManager.totalLampsGenerated,
      currentChunk: this.chunkManager.currentChunkKey,
      fps: this.currentFps,
      drawCalls
    };

    this.metricsListeners.forEach((cb) => cb(metrics));
  }

  public onPlayerState(cb: (state: PlayerMovementState) => void): () => void {
    this.stateListeners.push(cb);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== cb);
    };
  }

  public onMetrics(cb: (metrics: WorldMetrics) => void): () => void {
    this.metricsListeners.push(cb);
    return () => {
      this.metricsListeners = this.metricsListeners.filter((l) => l !== cb);
    };
  }

  public setBlizzardIntensity(val: number): void {
    this.blizzardSystem.setIntensity(val);
  }

  public setFogDensity(density: number): void {
    if (this.world.scene.fog instanceof FogExp2) {
      this.world.scene.fog.density = density;
    }
  }

  public setVolume(val: number): void {
    this.audioSystem.setVolume(val);
  }

  public teleport(x: number, z: number): void {
    this.controller.teleport(x, z);
    this.chunkManager.update(this.controller.playerPos);
  }
}
