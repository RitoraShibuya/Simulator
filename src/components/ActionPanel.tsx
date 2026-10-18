/**
 * BS Simulator - ActionPanel Component (Fixed Bottom Action Bar / Sheet)
 * Fixed to the bottom of the screen to guarantee it never goes out of bounds.
 */

import React from 'react';
import { CardInstance } from '../types';
import { useGameStore } from '../store/gameStore';
import { RotateCw, Eye, ArrowUp, ArrowDown, ZoomIn, X } from 'lucide-react';

interface ActionPanelProps {
  card: CardInstance | null;
  onClose: () => void;
  onZoom: (card: CardInstance) => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({ card, onClose, onZoom }) => {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const flipCard = useGameStore((s) => s.flipCard);
  const rotateCard = useGameStore((s) => s.rotateCard);
  const returnToDeck = useGameStore((s) => s.returnToDeck);

  if (!card) return null;

  const isMine = card.ownerId === localPlayerId;
  const isRested = card.physicalState === 'RESTED_90';
  const isFaceDown = card.physicalState === 'FACE_DOWN';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        backdropFilter: 'blur(12px)',
        border: '1.5px solid #38bdf8',
        borderRadius: '12px',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.35)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        maxWidth: '92vw',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        boxSizing: 'border-box',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      {/* 選択中カード情報 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {card.dataUrl ? (
          <img
            src={card.dataUrl}
            alt={card.name}
            style={{
              width: '28px',
              height: '39px',
              objectFit: 'cover',
              borderRadius: '4px',
              border: '1px solid #334155',
            }}
          />
        ) : (
          <div
            style={{
              width: '28px',
              height: '39px',
              backgroundColor: '#1e293b',
              borderRadius: '4px',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: '#94a3b8',
            }}
          >
            Card
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f8fafc', whiteSpace: 'nowrap' }}>
            {card.name.length > 12 ? `${card.name.slice(0, 12)}...` : card.name}
          </span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
            {card.zone} {isRested ? '・疲労中' : ''} {isFaceDown ? '・裏面' : ''}
          </span>
        </div>
      </div>

      <div style={{ height: '24px', width: '1px', backgroundColor: '#334155' }} />

      {/* アクションボタングループ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            onZoom(card);
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#0284c7',
            color: '#fff',
            border: 'none',
            padding: '7px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '44px',
            minWidth: '72px',
          }}
        >
          <ZoomIn size={14} />
          拡大
        </button>

        {isMine && (
          <>
            <button
              onClick={() => {
                rotateCard(card.instanceId);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: isRested ? '#ca8a04' : '#334155',
                color: '#f8fafc',
                border: 'none',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                minHeight: '44px',
                minWidth: '118px',
              }}
            >
              <RotateCw size={14} />
              回転（疲労）
            </button>

            <button
              onClick={() => {
                flipCard(card.instanceId);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#334155',
                color: '#f8fafc',
                border: 'none',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                minHeight: '44px',
                minWidth: '100px',
              }}
            >
              <Eye size={14} />
              {isFaceDown ? '表にする' : '伏せる (裏面)'}
            </button>

            <button
              onClick={() => {
                returnToDeck(card.instanceId, 'TOP');
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#7c3aed',
                color: '#fff',
                border: 'none',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                minHeight: '44px',
                minWidth: '108px',
              }}
            >
              <ArrowUp size={14} />
              デッキ上へ
            </button>

            <button
              onClick={() => {
                returnToDeck(card.instanceId, 'BOTTOM');
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#6d28d9',
                color: '#fff',
                border: 'none',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                minHeight: '44px',
                minWidth: '108px',
              }}
            >
              <ArrowDown size={14} />
              デッキ下へ
            </button>
          </>
        )}
      </div>

      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="閉じる"
      >
        <X size={18} />
      </button>
    </div>
  );
};
