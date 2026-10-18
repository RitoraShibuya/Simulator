/**
 * BS Simulator - TitleScene Component
 * Main title landing page with cyber TCG aesthetics.
 */

import React from 'react';
import { Layers, Swords } from 'lucide-react';

interface TitleSceneProps {
  onGoDeckBuilder: () => void;
  onGoLobby: () => void;
}

export const TitleScene: React.FC<TitleSceneProps> = ({ onGoDeckBuilder, onGoLobby }) => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 40%, #1e1b4b 0%, #090d16 80%)',
        color: '#fff',
        padding: '20px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景装飾 */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '420px',
          width: '100%',
          zIndex: 10,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            letterSpacing: '4px',
            color: '#38bdf8',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}
        >
          WebRTC P2P TCG Simulator
        </div>

        <h1
          style={{
            fontSize: '2.8rem',
            fontWeight: 900,
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '2px',
            textShadow: '0 0 30px rgba(56, 189, 248, 0.4)',
          }}
        >
          BS SIMULATOR
        </h1>

        <p
          style={{
            color: '#94a3b8',
            fontSize: '14px',
            margin: '0 0 40px 0',
            lineHeight: 1.6,
          }}
        >
          ブラウザ完結型・リアルタイム通信<br />
          バトスピ Web シミュレーター
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          <button
            onClick={onGoLobby}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '16px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 8px 24px -4px rgba(2, 132, 199, 0.6)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <Swords size={20} />
            対戦を始める (ロビー)
          </button>

          <button
            onClick={onGoDeckBuilder}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '16px',
              backgroundColor: '#6b21a8',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 8px 24px -4px rgba(107, 33, 168, 0.6)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <Layers size={20} />
            デッキメーカー
          </button>
        </div>

        <div
          style={{
            marginTop: '50px',
            fontSize: '12px',
            color: '#475569',
          }}
        >
          PeerJS / WebRTC DataChannel | Virtual 1414x1000 Engine
        </div>
      </div>
    </div>
  );
};
