/**
 * BS Simulator - ActionPanel Component (Fixed Bottom Action Bar / Sheet)
 * Fixed to the bottom of the screen to guarantee it never goes out of bounds.
 */

import React from 'react';
import { CardInstance } from '../types';
import { useGameStore } from '../store/gameStore';
import { RotateCw, Eye, ArrowUp, ArrowDown, ZoomIn, X, FlipHorizontal } from 'lucide-react';

interface ActionPanelProps {
  card: CardInstance | null;
  onClose: () => void;
  onZoom: (card: CardInstance) => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({ card, onClose, onZoom }) => {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const flipCard = useGameStore((s) => s.flipCard);
  const rotateCard = useGameStore((s) => s.rotateCard);
  const toggleCardSide = useGameStore((s) => s.toggleCardSide);
  const returnToDeck = useGameStore((s) => s.returnToDeck);

  if (!card) return null;

  const isMine = card.ownerId === localPlayerId;
  const isRested = (card.rotationAngle ?? (card.physicalState === 'RESTED_90' ? 90 : 0)) % 180 === 90;
  const isFaceDown = card.isFaceDown;
  const hasBackSide = Boolean(card.backDataUrl);

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
        padding: '16px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        maxWidth: '92vw',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        boxSizing: 'border-box',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      {/* 選択中カード情報 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {card.dataUrl ? (
          <img
            src={card.dataUrl}
            alt={card.name}
            style={{
              width: '56px',
              height: '78px',
              objectFit: 'cover',
              borderRadius: '4px',
              border: '1px solid #334155',
            }}
          />
        ) : (
          <div
            style={{
              width: '56px',
              height: '78px',
              backgroundColor: '#1e293b',
              borderRadius: '4px',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: '#94a3b8',
            }}
          >
            Card
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc', whiteSpace: 'nowrap' }}>
            {card.name.length > 12 ? `${card.name.slice(0, 12)}...` : card.name}
          </span>
          <span style={{ fontSize: '14px', color: '#94a3b8' }}>
            {card.zone} {isRested ? '・疲労中' : ''} {isFaceDown ? '・裏面' : ''}
          </span>
        </div>
      </div>

      <div style={{ height: '48px', width: '1px', backgroundColor: '#334155' }} />

      {/* アクションボタングループ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            onZoom(card);
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0284c7',
            color: '#fff',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '52px',
            minWidth: '96px',
          }}
        >
          <ZoomIn size={22} />
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
                gap: '8px',
                backgroundColor: isRested ? '#ca8a04' : '#334155',
                color: '#f8fafc',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                minHeight: '52px',
                minWidth: '142px',
              }}
            >
              <RotateCw size={22} />
              回転
            </button>

            <button
              onClick={() => {
                flipCard(card.instanceId);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#334155',
                color: '#f8fafc',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                minHeight: '52px',
                minWidth: '128px',
              }}
            >
              <Eye size={22} />
              {isFaceDown ? '表にする' : '伏せる'}
            </button>

            {hasBackSide && (
              <button
                onClick={() => toggleCardSide(card.instanceId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0f766e', color: '#f8fafc',
                  border: 'none', padding: '10px 16px', borderRadius: '6px', fontSize: '16px', cursor: 'pointer',
                  minHeight: '52px', minWidth: '154px',
                }}
              >
                <FlipHorizontal size={22} />
                {card.currentSide === 'BACK' ? '表面にする' : '裏面にする'}
              </button>
            )}

            <button
              onClick={() => {
                returnToDeck(card.instanceId, 'TOP');
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#7c3aed',
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                minHeight: '52px',
                minWidth: '140px',
              }}
            >
              <ArrowUp size={22} />
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
                gap: '8px',
                backgroundColor: '#6d28d9',
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                minHeight: '52px',
                minWidth: '140px',
              }}
            >
              <ArrowDown size={22} />
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
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="閉じる"
      >
        <X size={26} />
      </button>
    </div>
  );
};
