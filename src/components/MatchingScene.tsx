/**
 * BS Simulator - MatchingScene Component
 * Room Code Display, WebRTC PeerJS Handshake Status, Log Box.
 */

import React from 'react';
import { ConnectionStatus } from '../services/p2p';
import { Play, LogOut, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface MatchingSceneProps {
  roomCode: string;
  isHost: boolean;
  status: ConnectionStatus;
  statusMessage: string;
  logs: string[];
  canEnterGame: boolean;
  onEnterGame: () => void;
  onDisconnect: () => void;
}

export const MatchingScene: React.FC<MatchingSceneProps> = ({
  roomCode,
  isHost,
  status,
  statusMessage,
  logs,
  canEnterGame,
  onEnterGame,
  onDisconnect,
}) => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #090d16 90%)',
        color: '#fff',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#f59e0b' }}>
          P2P マッチング中...
        </h3>

        {/* 部屋番号ボックス */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#0f172a',
            border: '2px solid #f59e0b',
            borderRadius: '10px',
            padding: '16px',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
            {isHost ? '部屋番号 (相手に伝えてください)' : '接続先 部屋番号'}
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              letterSpacing: '6px',
              color: '#38bdf8',
              fontFamily: 'monospace',
            }}
          >
            {roomCode}
          </div>
        </div>

        {/* 接続ステータスインジケーター */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color:
              status === 'CONNECTED'
                ? '#22c55e'
                : status === 'ERROR'
                ? '#ef4444'
                : '#f59e0b',
          }}
        >
          {status === 'CONNECTING' && <Loader2 size={16} className="animate-spin" />}
          {status === 'CONNECTED' && <CheckCircle2 size={16} />}
          {status === 'ERROR' && <AlertCircle size={16} />}
          <span>{statusMessage}</span>
        </div>

        {/* 通信ログボックス */}
        <div
          style={{
            width: '100%',
            height: '110px',
            backgroundColor: '#090d16',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#22c55e',
            overflowY: 'auto',
            textAlign: 'left',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
          {logs.length === 0 && (
            <div style={{ color: '#475569' }}>ログ待機中...</div>
          )}
        </div>

        {/* 対戦開始ボタン */}
        <button
          onClick={onEnterGame}
          disabled={!canEnterGame}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: canEnterGame ? '#16a34a' : '#334155',
            color: canEnterGame ? '#fff' : '#64748b',
            border: 'none',
            padding: '14px',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: canEnterGame ? 'pointer' : 'not-allowed',
            boxShadow: canEnterGame
              ? '0 6px 20px -3px rgba(22, 163, 74, 0.6)'
              : 'none',
            transition: 'all 0.2s',
          }}
        >
          <Play size={18} />
          インゲームへ進む (対戦開始)
        </button>

        {/* 切断ボタン */}
        <button
          onClick={onDisconnect}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <LogOut size={16} />
          切断してロビーに戻る
        </button>
      </div>
    </div>
  );
};
