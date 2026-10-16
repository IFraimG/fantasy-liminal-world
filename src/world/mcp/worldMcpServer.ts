import { SnowWorldEngine, WorldMetrics } from '../engine.js';

export interface McpToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: any) => Promise<any> | any;
}

/**
 * Custom MCP tools for controlling and inspecting the winter procedural world.
 * Bridges seamlessly with IWSDK MCP runtime and CLI tools.
 */
export class WorldMcpServer {
  private engine: SnowWorldEngine;
  private tools: Map<string, McpToolDefinition> = new Map();

  constructor(engine: SnowWorldEngine) {
    this.engine = engine;
    this.registerTools();
    this.mountToWindow();
  }

  private registerTools(): void {
    // 1. inspect_world_state
    this.registerTool({
      name: 'inspect_world_state',
      description: 'Get live coordinates, active chunks count, generated buildings, lamps, and FPS',
      parameters: {},
      execute: () => {
        let metrics: WorldMetrics | null = null;
        const unsubscribe = this.engine.onMetrics((m) => {
          metrics = m;
        });
        unsubscribe();

        const cameraPos = this.engine.world?.camera.position;
        return {
          status: 'online',
          engine: 'IWSDK + Three.js ECS',
          player: {
            x: cameraPos ? Math.round(cameraPos.x * 10) / 10 : 0,
            y: cameraPos ? Math.round(cameraPos.y * 10) / 10 : 1.7,
            z: cameraPos ? Math.round(cameraPos.z * 10) / 10 : 0,
          },
          world: {
            activeChunks: this.engine.chunkManager.getActiveChunkCount(),
            totalBuildings: this.engine.chunkManager.totalBuildingsGenerated,
            totalLamps: this.engine.chunkManager.totalLampsGenerated,
            currentChunk: this.engine.chunkManager.currentChunkKey,
          },
          weather: {
            blizzardIntensity: this.engine.blizzardSystem.intensity,
            fogDensity: (this.engine.world.scene.fog as any)?.density ?? 0.016,
          }
        };
      }
    });

    // 2. set_weather
    this.registerTool({
      name: 'set_weather',
      description: 'Adjust weather conditions: blizzard intensity (0.1 to 3.0) and fog density (0.005 to 0.05)',
      parameters: {
        blizzardIntensity: 'number (0.1 - 3.0)',
        fogDensity: 'number (0.005 - 0.05)'
      },
      execute: (params: { blizzardIntensity?: number; fogDensity?: number }) => {
        if (typeof params.blizzardIntensity === 'number') {
          this.engine.setBlizzardIntensity(params.blizzardIntensity);
        }
        if (typeof params.fogDensity === 'number') {
          this.engine.setFogDensity(params.fogDensity);
        }
        return {
          success: true,
          blizzardIntensity: this.engine.blizzardSystem.intensity,
          fogDensity: (this.engine.world.scene.fog as any)?.density
        };
      }
    });

    // 3. teleport_player
    this.registerTool({
      name: 'teleport_player',
      description: 'Teleport the player to world coordinates (X, Z)',
      parameters: {
        x: 'number',
        z: 'number'
      },
      execute: (params: { x: number; z: number }) => {
        this.engine.teleport(params.x, params.z);
        return {
          success: true,
          newPosition: { x: params.x, y: 1.7, z: params.z }
        };
      }
    });

    // 4. get_active_chunks
    this.registerTool({
      name: 'get_active_chunks',
      description: 'List all currently materialized procedural chunks with coordinates and object counts',
      parameters: {},
      execute: () => {
        return {
          count: this.engine.chunkManager.getActiveChunkCount(),
          chunks: this.engine.chunkManager.getActiveChunks().map(c => ({
            key: `${c.cx},${c.cz}`,
            cx: c.cx,
            cz: c.cz,
            buildings: c.buildingCount,
            streetLamps: c.lampCount
          }))
        };
      }
    });
  }

  public registerTool(tool: McpToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public async executeTool(name: string, params: any = {}): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found. Available: ${Array.from(this.tools.keys()).join(', ')}`);
    }
    return await tool.execute(params);
  }

  public getTools(): McpToolDefinition[] {
    return Array.from(this.tools.values());
  }

  private mountToWindow(): void {
    if (typeof window !== 'undefined') {
      (window as any).WORLD_MCP = {
        getTools: () => this.getTools().map(t => ({ name: t.name, description: t.description, parameters: t.parameters })),
        call: (name: string, params: any) => this.executeTool(name, params),
        server: this
      };
      console.log('❄️ [IWSDK + MCP] World MCP Server registered on window.WORLD_MCP');
    }
  }
}
