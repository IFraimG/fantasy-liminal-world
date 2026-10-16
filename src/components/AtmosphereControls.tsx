import React, { useState } from 'react';
import { Sliders, Volume2, VolumeX, CloudSnow, Eye, Navigation, Maximize2, Music, Compass } from 'lucide-react';

interface AtmosphereControlsProps {
  blizzardIntensity: number;
  onBlizzardChange: (val: number) => void;
  fogDensity: number;
  onFogChange: (val: number) => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  bgmVolume: number;
  onBgmVolumeChange: (val: number) => void;
  keyMapping: 'user_custom' | 'classic';
  onKeyMappingChange: (val: 'user_custom' | 'classic') => void;
  moveOrientation: 'fixed_world' | 'camera';
  onMoveOrientationChange: (val: 'fixed_world' | 'camera') => void;
  onTeleport: (x: number, z: number) => void;
}

export const AtmosphereControls: React.FC<AtmosphereControlsProps> = ({
  blizzardIntensity,
  onBlizzardChange,
  fogDensity,
  onFogChange,
  volume,
  onVolumeChange,
  bgmVolume,
  onBgmVolumeChange,
  keyMapping,
  onKeyMappingChange,
  moveOrientation,
  onMoveOrientationChange,
  onTeleport
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(0.6);
    } else {
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e2e8f0'
    }}>
      {/* Expanded Controls Drawer */}
      {isOpen && (
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '12px',
          width: '290px',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#f8fafc' }}>
              ❄️ Настройки атмосферы
            </span>
            <button
              onClick={toggleFullscreen}
              title="На весь экран"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                borderRadius: '6px',
                padding: '4px 8px'
              }}
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Blizzard Intensity Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#93c5fd' }}>
                <CloudSnow size={15} /> Интенсивность метели
              </span>
              <span style={{ fontWeight: 600 }}>{blizzardIntensity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={blizzardIntensity}
              onChange={(e) => onBlizzardChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
              <span>Тихо</span>
              <span>Метель</span>
              <span>Буран</span>
            </div>
          </div>

          {/* Fog Density Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                <Eye size={15} /> Ночной туман
              </span>
              <span style={{ fontWeight: 600 }}>{Math.round(fogDensity * 1000)}</span>
            </div>
            <input
              type="range"
              min="0.008"
              max="0.035"
              step="0.002"
              value={fogDensity}
              onChange={(e) => onFogChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#94a3b8', cursor: 'pointer' }}
            />
          </div>

          {/* Sound Volume Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                {isMuted || volume === 0 ? <VolumeX size={15} color="#ef4444" /> : <Volume2 size={15} color="#22c55e" />}
                Ветер и хруст снега
              </span>
              <span style={{ fontWeight: 600 }}>{Math.round(volume * 100)}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={toggleMute}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: isMuted ? '#ef4444' : '#cbd5e1',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer'
                }}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setIsMuted(false);
                  onVolumeChange(parseFloat(e.target.value));
                }}
                style={{ flex: 1, accentColor: '#22c55e', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Background Music Volume Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f472b6' }}>
                <Music size={15} /> Фоновая музыка (MP3)
              </span>
              <span style={{ fontWeight: 600 }}>{Math.round(bgmVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bgmVolume}
              onChange={(e) => onBgmVolumeChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#ec4899', cursor: 'pointer' }}
            />
          </div>

          {/* Movement Mode & Keymapping */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
            <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
              <Compass size={13} /> Управление перемещением
            </div>
            
            {/* Key mapping selector */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Раскладка клавиш:</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => onKeyMappingChange('user_custom')}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    fontSize: '10px',
                    borderRadius: '6px',
                    border: keyMapping === 'user_custom' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: keyMapping === 'user_custom' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: keyMapping === 'user_custom' ? '#f8fafc' : '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: keyMapping === 'user_custom' ? 600 : 400
                  }}
                >
                  W(вперед) A(назад)<br/>S(влево) D(вправо)
                </button>
                <button
                  onClick={() => onKeyMappingChange('classic')}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    fontSize: '10px',
                    borderRadius: '6px',
                    border: keyMapping === 'classic' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: keyMapping === 'classic' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: keyMapping === 'classic' ? '#f8fafc' : '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: keyMapping === 'classic' ? 600 : 400
                  }}
                >
                  Классика WASD<br/>(W-вперед, S-назад)
                </button>
              </div>
            </div>

            {/* Movement orientation selector */}
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Ориентация движения:</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => onMoveOrientationChange('fixed_world')}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    fontSize: '10px',
                    borderRadius: '6px',
                    border: moveOrientation === 'fixed_world' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: moveOrientation === 'fixed_world' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: moveOrientation === 'fixed_world' ? '#f8fafc' : '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: moveOrientation === 'fixed_world' ? 600 : 400
                  }}
                >
                  🧭 Фиксированные стороны мира
                </button>
                <button
                  onClick={() => onMoveOrientationChange('camera')}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    fontSize: '10px',
                    borderRadius: '6px',
                    border: moveOrientation === 'camera' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: moveOrientation === 'camera' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: moveOrientation === 'camera' ? '#f8fafc' : '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: moveOrientation === 'camera' ? 600 : 400
                  }}
                >
                  👁️ По взгляду камеры
                </button>
              </div>
            </div>
          </div>

          {/* Quick Teleport presets */}
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Navigation size={13} /> Быстрое перемещение
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                onClick={() => onTeleport(0, 0)}
                style={{
                  padding: '6px 8px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#e2e8f0',
                  cursor: 'pointer'
                }}
              >
                🏠 Исходный двор
              </button>
              <button
                onClick={() => onTeleport(0, -130)}
                style={{
                  padding: '6px 8px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#e2e8f0',
                  cursor: 'pointer'
                }}
              >
                🏢 Северный квартал
              </button>
              <button
                onClick={() => onTeleport(130, 0)}
                style={{
                  padding: '6px 8px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#e2e8f0',
                  cursor: 'pointer'
                }}
              >
                🏮 Восточный массив
              </button>
              <button
                onClick={() => onTeleport(200, 200)}
                style={{
                  padding: '6px 8px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#e2e8f0',
                  cursor: 'pointer'
                }}
              >
                ❄️ Дальняя окраина
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '30px',
          padding: '10px 18px',
          color: '#f8fafc',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)'
        }}
      >
        <Sliders size={16} color="#38bdf8" />
        {isOpen ? 'Закрыть панель' : 'Настройки погоды'}
      </button>
    </div>
  );
};
