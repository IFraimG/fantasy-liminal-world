import React, { useState } from 'react';
import { WorldMetrics } from '../world/engine.js';
import { Cpu, Terminal, CheckCircle2, RefreshCw } from 'lucide-react';

interface McpStatusPanelProps {
  metrics: WorldMetrics | null;
}

export const McpStatusPanel: React.FC<McpStatusPanelProps> = ({ metrics }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mcpLog, setMcpLog] = useState<string>('');

  const runMcpInspect = async () => {
    if (typeof window !== 'undefined' && (window as any).WORLD_MCP) {
      try {
        const res = await (window as any).WORLD_MCP.call('inspect_world_state', {});
        setMcpLog(JSON.stringify(res, null, 2));
      } catch (err: any) {
        setMcpLog('Error: ' + err.message);
      }
    }
  };

  const runMcpChunks = async () => {
    if (typeof window !== 'undefined' && (window as any).WORLD_MCP) {
      try {
        const res = await (window as any).WORLD_MCP.call('get_active_chunks', {});
        setMcpLog(JSON.stringify(res, null, 2));
      } catch (err: any) {
        setMcpLog('Error: ' + err.message);
      }
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      zIndex: 50,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e2e8f0'
    }}>
      {/* Expanded Diagnostics Drawer */}
      {isOpen && (
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '18px',
          marginBottom: '12px',
          width: '320px',
          maxHeight: '440px',
          overflowY: 'auto',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: '12px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={16} /> IWSDK & MCP Интеграция
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontSize: '11px' }}>
              <CheckCircle2 size={12} /> Active
            </span>
          </div>

          {/* Engine Real-time Metrics */}
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            padding: '10px 12px',
            borderRadius: '8px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px'
          }}>
            <div>
              <div style={{ color: '#94a3b8' }}>Активные чанки:</div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#f8fafc' }}>
                {metrics?.activeChunks ?? 25} (5x5)
              </div>
            </div>
            <div>
              <div style={{ color: '#94a3b8' }}>FPS / Кадры:</div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#4ade80' }}>
                {metrics?.fps ?? 60} fps
              </div>
            </div>
            <div>
              <div style={{ color: '#94a3b8' }}>Зданий в мире:</div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#f8fafc' }}>
                {metrics?.totalBuildings ?? 0}
              </div>
            </div>
            <div>
              <div style={{ color: '#94a3b8' }}>Фонарей со светом:</div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#f59e0b' }}>
                {metrics?.totalLamps ?? 0}
              </div>
            </div>
          </div>

          {/* MCP Tools & Actions */}
          <div>
            <div style={{ color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>
              Вызов MCP инструментов:
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={runMcpInspect}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  color: '#38bdf8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Terminal size={12} /> inspect_world
              </button>
              <button
                onClick={runMcpChunks}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  color: '#38bdf8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <RefreshCw size={12} /> get_chunks
              </button>
            </div>
          </div>

          {/* Log Output */}
          {mcpLog && (
            <pre style={{
              backgroundColor: '#090d16',
              padding: '8px',
              borderRadius: '6px',
              maxHeight: '120px',
              overflow: 'auto',
              fontSize: '10px',
              color: '#38bdf8',
              margin: 0
            }}>
              {mcpLog}
            </pre>
          )}

          <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
            Поддерживает <code>iwsdk mcp stdio</code> и вызовы из Claude / AGY.
          </div>
        </div>
      )}

      {/* Trigger Button */}
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
        <Cpu size={16} color="#4ade80" />
        {isOpen ? 'Скрыть MCP' : 'MCP & Статус'}
      </button>
    </div>
  );
};
