/**
 * BS Simulator - LobbyScene Component
 * Deck selection, host room creation, guest room join.
 */

import React, { useRef, useState } from 'react';
import { DeckData } from '../types';
import { useGameStore } from '../store/gameStore';
import { Swords, LogIn, ArrowLeft, Upload, CheckCircle2 } from 'lucide-react';

interface LobbySceneProps {
  onBackToTitle: () => void;
  onHostCreate: (roomCode: string, deck: DeckData | null) => void;
  onGuestJoin: (roomCode: string, deck: DeckData | null) => void;
}

export const LobbyScene: React.FC<LobbySceneProps> = ({
  onBackToTitle,
  onHostCreate,
  onGuestJoin,
}) => {
  const [selectedDeck, setSelectedDeck] = useState<DeckData | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const deckInputRef = useRef<HTMLInputElement>(null);
  const setLocalDeck = useGameStore((s) => s.setLocalDeck);

  const handleDeckFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const deck: DeckData = JSON.parse(ev.target?.result as string);
        setSelectedDeck(deck);
        setLocalDeck(deck);
      } catch (err) {
        alert('デッキデータの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
  };

  const handleCreateRoom = () => {
    // 4桁の部屋番号ランダム生成 (1000 - 9999)
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    onHostCreate(randomCode, selectedDeck);
  };

  const handleJoinRoom = () => {
    const code = roomCodeInput.trim();
    if (code.length !== 4 || isNaN(Number(code))) {
      alert('4桁の数字の部屋番号を入力してください。');
      return;
    }
    onGuestJoin(code, selectedDeck);
  };

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
      <input
        type="file"
        ref={deckInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleDeckFileLoad}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '1.6rem', color: '#38bdf8' }}>
            対戦ロビー
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            デッキを選択して部屋を作成または参加してください
          </p>
        </div>

        {/* デッキ選択エリア */}
        <div
          style={{
            backgroundColor: '#0f172a',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid #334155',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            使用するデッキ:
          </div>
          <button
            onClick={() => deckInputRef.current?.click()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#6b21a8',
              color: '#fff',
              border: 'none',
              padding: '10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <Upload size={16} />
            デッキJSONを選択
          </button>
          <div
            style={{
              marginTop: '8px',
              fontSize: '12px',
              color: selectedDeck ? '#22c55e' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {selectedDeck ? (
              <>
                <CheckCircle2 size={14} />
                選択中: {selectedDeck.name} ({selectedDeck.cards.length}枚)
              </>
            ) : (
              '未選択 (サンプルデッキを使用)'
            )}
          </div>
        </div>

        {/* ホスト部屋作成 */}
        <button
          onClick={handleCreateRoom}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: '#16a34a',
            color: '#fff',
            border: 'none',
            padding: '14px',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 6px 20px -3px rgba(22, 163, 74, 0.5)',
          }}
        >
          <Swords size={18} />
          部屋を作成する (ホスト)
        </button>

        {/* ゲスト部屋参加 */}
        <div
          style={{
            borderTop: '1px dashed #334155',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <input
            type="text"
            maxLength={4}
            placeholder="4桁の部屋番号"
            inputMode="numeric"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0f172a',
              color: '#fff',
              border: '1px solid #475569',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '18px',
              letterSpacing: '4px',
              fontWeight: 'bold',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleJoinRoom}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            <LogIn size={18} />
            部屋に参加する (ゲスト)
          </button>
        </div>

        <button
          onClick={onBackToTitle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            color: '#94a3b8',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          <ArrowLeft size={16} />
          タイトルに戻る
        </button>
      </div>
    </div>
  );
};
