/**
 * BS Simulator - CardObject Component (v3)
 * Draggable Card with dynamic core counting from physical overlapping tokens.
 * Features:
 * - Direct useDraggable for reliable grabbing & movement
 * - Layering: Z-Index 10~50 (renders beneath cores 100~200)
 * - Dynamic counting of physically placed cores (getAttachedCoresInfo)
 * - Fixed bottom ActionPanel trigger on click
 * - Full null-safety
 */

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CardInstance } from '../types';
import { useGameStore } from '../store/gameStore';

interface CardObjectProps {
  card: CardInstance;
  onZoom: (card: CardInstance) => void;
}

export const CardObject: React.FC<CardObjectProps> = ({ card, onZoom }) => {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const currentViewMode = useGameStore((s) => s.currentViewMode);
  const setSelectedCardForAction = useGameStore((s) => s.setSelectedCardForAction);
  const selectedCardForAction = useGameStore((s) => s.selectedCardForAction);
  const getAttachedCoresInfo = useGameStore((s) => s.getAttachedCoresInfo);

  const isMine = card.ownerId === localPlayerId;

  // 視点切り替えによるフィルタリング:
  // MY_BOARD: 自分のカードのみ描画
  // OPPONENT_BOARD: 相手のカードのみ反転描画
  if (currentViewMode === 'MY_BOARD' && !isMine) {
    return null;
  }
  if (currentViewMode === 'OPPONENT_BOARD' && isMine) {
    return null;
  }

  // ドラッグ可否判定
  const canDrag = isMine && currentViewMode === 'MY_BOARD';

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${card.instanceId}`,
    data: { type: 'CARD', card },
    disabled: !canDrag,
  });

  // null-safety: positionが未定義の場合はデフォルト値を使用
  if (!card || !card.position) return null;

  const posX = card.position.x ?? 500;
  const posY = card.position.y ?? 500;

  // 視点に応じた座標計算:
  // 自分のカード: (posX, posY)
  // 相手のカード: (1000 - posX - 64, 1000 - posY - 90)
  const displayX = isMine ? posX : Math.max(0, Math.min(936, 1000 - posX - 64));
  const displayY = isMine ? posY : Math.max(0, Math.min(910, 1000 - posY - 90));

  // 表裏・可視性判定
  const isReversed =
    // 相手の手札は、以前に公開ゾーンで共有されていたカードでも必ず裏向きにする。
    (card.zone === 'HAND' && !isMine) ||
    card.physicalState === 'FACE_DOWN' ||
    card.visibility === 'HIDDEN_ALL' ||
    (card.visibility === 'PRIVATE_OWNER' && !isMine);

  const isRested = card.physicalState === 'RESTED_90';

  // 向き:
  // 自陣: 0deg (疲労時 90deg)
  // 相手陣: 180deg (疲労時 270deg)
  const baseRotation = isMine ? (isRested ? 90 : 0) : (isRested ? 270 : 180);

  const isSelected = selectedCardForAction?.instanceId === card.instanceId;

  // カードの上に物理的に乗っているコアの動的カウント
  const { count: dynamicCoreCount, hasSoulCore } = getAttachedCoresInfo(card);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCardForAction(card);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onZoom(card);
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        handleClick(e);
      }}
      style={{
        position: 'absolute',
        left: `${displayX}px`,
        top: `${displayY}px`,
        width: '64px',
        height: '90px',
        // isDragging中は元要素を非表示にしてDragOverlayのゴーストのみ表示（残像防止）
        opacity: isDragging ? 0 : 1,
        // 描画順: カードは 10〜50（コアは 100〜200 なので常にコアが上面に乗る）
        zIndex: isDragging ? 500 : isSelected ? 40 : (card.position.zIndex ?? 10),
        borderRadius: '6px',
        cursor: canDrag ? 'grab' : 'pointer',
        boxShadow: isSelected
          ? '0 0 0 2px #38bdf8, 0 8px 20px rgba(56, 189, 248, 0.4)'
          : '0 4px 10px rgba(0, 0, 0, 0.5)',
        border: isMine ? '1.5px solid #3498db' : '1.5px solid #e74c3c',
        backgroundColor: isReversed ? '#111' : '#1e293b',
        backgroundImage: !isReversed && card.dataUrl ? `url(${card.dataUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isReversed ? 'center' : 'flex-end',
        alignItems: 'center',
        padding: '3px',
        boxSizing: 'border-box',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transformOrigin: 'center center',
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${baseRotation}deg)`
          : `rotate(${baseRotation}deg)`,
        touchAction: 'none',
        userSelect: 'none',
        pointerEvents: isDragging ? 'none' : 'auto',
      }}
    >
      {/* 裏面表示 */}
      {isReversed && (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '4px',
            backgroundColor: '#0f172a',
            backgroundImage: card.backDataUrl ? `url(${card.backDataUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            fontSize: '9px',
            fontWeight: 'bold',
            textAlign: 'center',
            border: '1px solid #334155',
          }}
        >
          {!card.backDataUrl && (
            <div style={{ opacity: 0.6 }}>
              {card.zone === 'BURST' ? 'BURST' : 'BS CARD'}
            </div>
          )}
        </div>
      )}

      {/* 表面で画像がない場合のカード名表示 */}
      {!isReversed && !card.dataUrl && (
        <div
          style={{
            color: '#fff',
            fontSize: '10px',
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            wordBreak: 'break-all',
            padding: '2px',
          }}
        >
          {card.name}
        </div>
      )}

      {/* 物理的に乗っているコア数の動的バッジ */}
      {dynamicCoreCount > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '-7px',
            right: '-7px',
            display: 'flex',
            gap: '2px',
            alignItems: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            padding: '2px 5px',
            borderRadius: '10px',
            border: hasSoulCore ? '1.5px solid #c084fc' : '1px solid #38bdf8',
            boxShadow: '0 2px 6px rgba(0,0,0,0.7)',
            pointerEvents: 'none',
          }}
        >
          {hasSoulCore && (
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#c084fc',
                marginRight: '2px',
              }}
              title="ソウルコア含む"
            />
          )}
          <span
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: hasSoulCore ? '#e9d5ff' : '#38bdf8',
              lineHeight: 1,
            }}
          >
            {dynamicCoreCount}
          </span>
        </div>
      )}

      {/* 所有者インジケーター (相手カードの場合) */}
      {!isMine && (
        <div
          style={{
            position: 'absolute',
            bottom: '2px',
            left: '2px',
            backgroundColor: 'rgba(231, 76, 60, 0.85)',
            color: '#fff',
            fontSize: '8px',
            padding: '1px 3px',
            borderRadius: '2px',
            fontWeight: 'bold',
          }}
        >
          2P
        </div>
      )}
    </div>
  );
};
