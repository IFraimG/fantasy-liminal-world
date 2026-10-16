import React from 'react';
import { PlayerMovementState } from '../world/firstPerson.js';
import { Compass, Footprints, Wind, Eye } from 'lucide-react';

interface HudOverlayProps {
  playerState: PlayerMovementState | null;
  isLocked: boolean;
  onRequestLock: () => void;
  blizzardIntensity: number;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  playerState,
  isLocked,
  onRequestLock,
  blizzardIntensity
}) => {
  const heading = playerState?.headingDeg ?? 0;
  const distance = playerState?.distanceTraveled ?? 0;
  const speed = playerState?.speed ?? 0;
  const isRunning = playerState?.isRunning ?? false;
  const isMoving = playerState?.isMoving ?? false;

  const posX = playerState?.position ? Math.round(playerState.position.x) : 0;
  const posZ = playerState?.position ? Math.round(playerState.position.z) : 0;

  // Cardinal directions calculation
  const getDirectionLabel = (deg: number): string => {
    const directions = ['С (Север)', 'СВ', 'В (Восток)', 'ЮВ', 'Ю (Юг)', 'ЮЗ', 'З (Запад)', 'СЗ'];
    const index = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
    return directions[index];
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '20px',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textShadow: '0 2px 8px rgba(0, 0, 0, 0.85)',
      userSelect: 'none'
    }}>
      {/* Top Bar: Compass & Coordinates */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left: Atmospheric Location HUD */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          padding: '12px 18px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#94a3b8' }}>
            Спальный район • Зима
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
            {posX}м, {posZ}м
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Footprints size={14} color="#60a5fa" />
            Пройдено: {distance} м
          </div>
        </div>

        {/* Center: Compass Heading */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          padding: '10px 24px',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Compass size={18} color="#f59e0b" style={{ transform: `rotate(${heading}deg)`, transition: 'transform 0.1s linear' }} />
          <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '1px' }}>
            {heading}° {getDirectionLabel(heading)}
          </span>
        </div>

        {/* Right: Weather & Movement status */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          padding: '12px 18px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'right',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', color: '#93c5fd' }}>
            <Wind size={15} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>
              {blizzardIntensity > 1.8 ? 'Сильная пурга' : blizzardIntensity > 0.8 ? 'Метель' : 'Тихий снегопад'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {isMoving ? (isRunning ? '🏃 Бег по снегу' : '🚶 Шаг по сугробам') : '❄️ На месте'}
          </div>
        </div>
      </div>

      {/* Center: Pointer Lock activation prompt if not locked */}
      {!isLocked && (
        <div style={{
          alignSelf: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '18px 28px',
          borderRadius: '16px',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
          pointerEvents: 'auto',
          cursor: 'pointer',
          maxWidth: '440px'
        }}
        onClick={onRequestLock}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
            <Eye size={22} color="#f59e0b" />
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              Кликните для обзора от 1-го лица
            </span>
          </div>
          <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
            Двигайте мышью для свободного взгляда во все стороны.<br />
            Клавиши: <b>W (вперед), A (назад), S (влево), D (вправо)</b> или <b>Стрелки</b>.<br />
            Зажмите <b>Shift</b> для бега по снегу.
          </div>
        </div>
      )}

      {/* Subtle Center Aim Reticle when locked */}
      {isLocked && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '6px',
          height: '6px',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.55)',
          boxShadow: '0 0 6px rgba(0, 0, 0, 0.8)'
        }} />
      )}

      {/* Bottom Hint */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.6)',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          padding: '6px 12px',
          borderRadius: '6px'
        }}>
          💡 По мере движения вперед процедурно расширяются новые дворы и панельки
        </div>
      </div>
    </div>
  );
};
