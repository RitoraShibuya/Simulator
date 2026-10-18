/**
 * BS Simulator - ZoomModal Component
 * High-resolution modal preview for cards
 */

import React from 'react';
import { CardInstance } from '../types';
import { X } from 'lucide-react';
import { COMMON_CARD_BACK } from '../board';

interface ZoomModalProps {
  card: CardInstance | null;
  onClose: () => void;
}

export const ZoomModal: React.FC<ZoomModalProps> = ({ card, onClose }) => {
  if (!card) return null;

  const isFaceDown = card.isFaceDown || card.visibility === 'HIDDEN_ALL';
  const imageUrl = card.currentSide === 'BACK' ? card.backDataUrl : card.dataUrl;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '96vw',
          maxHeight: '92vh',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-10px',
            background: 'rgba(239, 68, 68, 0.8)',
            border: 'none',
            color: '#fff',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <X size={20} />
        </button>

        {isFaceDown ? (
          <div
            style={{
              width: 'min(94vw, calc(88vh * 5 / 7))',
              aspectRatio: '5 / 7',
              backgroundColor: '#0f172a',
              borderRadius: '16px',
              border: '3px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              background: COMMON_CARD_BACK,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
            }}
          >
            非公開
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={card.name}
            style={{
              height: '88vh',
              width: 'auto',
              maxHeight: '88vh',
              maxWidth: '94vw',
              borderRadius: '14px',
              border: '3px solid #38bdf8',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(56, 189, 248, 0.4)',
              objectFit: 'contain',
            }}
          />
        ) : (
          <div
            style={{
              width: 'min(94vw, calc(88vh * 5 / 7))',
              aspectRatio: '5 / 7',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: '16px',
              border: '3px solid #38bdf8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              boxSizing: 'border-box',
              color: '#fff',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(56, 189, 248, 0.3)',
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '16px' }}>
              {card.name}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              ゾーン: {card.zone}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#38bdf8', marginTop: '8px' }}>
              コア: {card.attachedCores}個 {card.attachedSoulCore ? '＋ ソウルコア' : ''}
            </div>
          </div>
        )}

        <div style={{ marginTop: '12px', color: '#e2e8f0', fontSize: '1.1rem', fontWeight: 'bold' }}>
          {isFaceDown ? '非公開' : card.name}
        </div>
      </div>
    </div>
  );
};
