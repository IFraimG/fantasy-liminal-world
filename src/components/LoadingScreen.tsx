import React from 'react';
import { Snowflake, CheckCircle2 } from 'lucide-react';

interface LoadingScreenProps {
  progress: number;
  statusText: string;
  isReady: boolean;
  onEnter: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  statusText,
  isReady,
  onEnter
}) => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: '#070a10',
      backgroundImage: 'radial-gradient(circle at 50% 40%, #111a2e 0%, #06090f 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      userSelect: 'none',
      transition: 'opacity 0.6s ease-out'
    }}>
      {/* Title & Icon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '10px'
      }}>
        <Snowflake size={32} color="#38bdf8" style={{ animation: 'spin 12s linear infinite' }} />
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          margin: 0,
          background: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Зимний спальный район
        </h1>
      </div>

      <div style={{
        fontSize: '13px',
        color: '#64748b',
        letterSpacing: '1px',
        marginBottom: '20px',
        textTransform: 'uppercase'
      }}>
        3D Reality • IWSDK Engine • Procedural World
      </div>

      {/* Character Role Card */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        backgroundColor: 'rgba(30, 41, 59, 0.75)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '14px',
        padding: '10px 18px',
        marginBottom: '28px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        maxWidth: '380px'
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid #ef4444',
          boxShadow: '0 0 14px rgba(239, 68, 68, 0.5)',
          flexShrink: 0
        }}>
          <img
            src="./textures/ibis.png"
            alt="Красный ибис"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f87171', letterSpacing: '0.5px' }}>
            Роль: Красный Ибис (Scarlet Ibis)
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px', lineHeight: '1.4' }}>
            Камера от 1-го лица на уровне головы. Опустите взгляд вниз, чтобы увидеть свой скин!
          </div>
        </div>
      </div>

      {/* Progress Box */}
      <div style={{
        width: '340px',
        maxWidth: '85vw',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {/* Status text & percentage */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
            {statusText}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>
            {Math.round(progress)}%
          </span>
        </div>

        {/* Progress Bar Track */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
            borderRadius: '4px',
            transition: 'width 0.25s ease-out',
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.5)'
          }} />
        </div>

        {/* Action Button or Loading indicator */}
        <div style={{ marginTop: '10px' }}>
          {isReady ? (
            <button
              onClick={onEnter}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: '#0284c7',
                backgroundImage: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                border: '1px solid #38bdf8',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(2, 132, 199, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(2, 132, 199, 0.4)';
              }}
            >
              <CheckCircle2 size={18} /> Войти во двор
            </button>
          ) : (
            <div style={{ fontSize: '12px', color: '#475569', textAlign: 'center' }}>
              Подготовка текстур и компиляция шейдеров...
            </div>
          )}
        </div>
      </div>

      {/* Footer Instructions */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        fontSize: '12px',
        color: '#475569',
        textAlign: 'center',
        lineHeight: '1.6'
      }}>
        Управление: <b>W, A, S, D</b> для перемещения • <b>Shift</b> для бега • <b>Мышь</b> для обзора
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
