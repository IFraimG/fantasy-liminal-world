import React, { useEffect, useRef, useState } from 'react';
import { SnowWorldEngine, WorldMetrics } from './world/engine.js';
import { WorldMcpServer } from './world/mcp/worldMcpServer.js';
import { PlayerMovementState } from './world/firstPerson.js';
import { HudOverlay } from './components/HudOverlay.js';
import { AtmosphereControls } from './components/AtmosphereControls.js';
import { McpStatusPanel } from './components/McpStatusPanel.js';
import { LoadingScreen } from './components/LoadingScreen.js';

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<SnowWorldEngine | null>(null);
  const [playerState, setPlayerState] = useState<PlayerMovementState | null>(null);
  const [metrics, setMetrics] = useState<WorldMetrics | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [blizzardIntensity, setBlizzardIntensity] = useState(1.0);
  const [fogDensity, setFogDensity] = useState(0.010);
  const [volume, setVolume] = useState(0.6);
  const [bgmVolume, setBgmVolume] = useState(0.65);
  const [keyMapping, setKeyMapping] = useState<'user_custom' | 'classic'>('user_custom');
  const [moveOrientation, setMoveOrientation] = useState<'fixed_world' | 'camera'>('fixed_world');

  // Loading screen states
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('Загрузка модулей...');
  const [isReady, setIsReady] = useState(false);
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const eng = SnowWorldEngine.getInstance();
    let isCancelled = false;

    eng.init(containerRef.current, (percent, status) => {
      if (isCancelled) return;
      setLoadingProgress(percent);
      setLoadingStatus(status);
      if (percent >= 100) {
        setIsReady(true);
      }
    }).then(() => {
      if (isCancelled) return;
      setEngine(eng);

      // Register MCP server
      new WorldMcpServer(eng);

      // Listen to player movements
      eng.onPlayerState((state) => {
        setPlayerState(state);
      });

      // Listen to engine metrics
      eng.onMetrics((m) => {
        setMetrics(m);
      });
    });

    const handleLockChange = () => {
      setIsLocked(document.pointerLockElement === containerRef.current);
    };
    document.addEventListener('pointerlockchange', handleLockChange);

    return () => {
      isCancelled = true;
      document.removeEventListener('pointerlockchange', handleLockChange);
    };
  }, []);

  const handleEnterWorld = () => {
    setShowLoading(false);
    engine?.startAudio();
    setTimeout(() => {
      engine?.controller.requestLock();
    }, 200);
  };

  const handleRequestLock = () => {
    engine?.controller.requestLock();
  };

  const handleBlizzardChange = (val: number) => {
    setBlizzardIntensity(val);
    engine?.setBlizzardIntensity(val);
  };

  const handleFogChange = (val: number) => {
    setFogDensity(val);
    engine?.setFogDensity(val);
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    engine?.setVolume(val);
  };

  const handleBgmVolumeChange = (val: number) => {
    setBgmVolume(val);
    engine?.setBgmVolume(val);
  };

  const handleKeyMappingChange = (val: 'user_custom' | 'classic') => {
    setKeyMapping(val);
    engine?.setKeyMapping(val);
  };

  const handleMoveOrientationChange = (val: 'fixed_world' | 'camera') => {
    setMoveOrientation(val);
    engine?.setMoveOrientation(val);
  };

  const handleTeleport = (x: number, z: number) => {
    engine?.teleport(x, z);
  };

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#0a0e17'
    }}>
      {/* Loading Screen Overlay with Progress Bar */}
      {showLoading && (
        <LoadingScreen
          progress={loadingProgress}
          statusText={loadingStatus}
          isReady={isReady}
          onEnter={handleEnterWorld}
        />
      )}

      {/* 3D Scene Viewport */}
      <div
        ref={containerRef}
        id="scene-container"
        style={{
          width: '100%',
          height: '100%',
          cursor: isLocked ? 'none' : 'crosshair',
          display: 'block'
        }}
      />

      {/* Atmospheric First-Person HUD */}
      {!showLoading && (
        <HudOverlay
          playerState={playerState}
          isLocked={isLocked}
          onRequestLock={handleRequestLock}
          blizzardIntensity={blizzardIntensity}
        />
      )}

      {/* Weather & Atmosphere Controls Drawer (Bottom Right) */}
      {!showLoading && (
        <AtmosphereControls
          blizzardIntensity={blizzardIntensity}
          onBlizzardChange={handleBlizzardChange}
          fogDensity={fogDensity}
          onFogChange={handleFogChange}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          bgmVolume={bgmVolume}
          onBgmVolumeChange={handleBgmVolumeChange}
          keyMapping={keyMapping}
          onKeyMappingChange={handleKeyMappingChange}
          moveOrientation={moveOrientation}
          onMoveOrientationChange={handleMoveOrientationChange}
          onTeleport={handleTeleport}
        />
      )}

      {/* MCP & Engine Diagnostics Panel (Bottom Left) */}
      {!showLoading && <McpStatusPanel metrics={metrics} />}
    </div>
  );
};

export default App;
