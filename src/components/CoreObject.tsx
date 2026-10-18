/**
 * BS Simulator - CoreObject Component (v3)
 * Independent Physical Token Core in 1414x1000 Virtual Space.
 * Features:
 * - Free movement across board, reserve, life, trash, and on top of cards
 * - Higher Z-Index (100~200) than cards (10~50) so it always renders on top
 * - Interactive dragging via useDraggable
 * - Glowing gem-like appearance (Blue core / Purple soul core)
 */

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CoreInstance } from '../types';
import { useGameStore } from '../store/gameStore';
import { BOARD_HEIGHT, BOARD_WIDTH, CORE_SIZE, SOUL_CORE_SIZE } from '../board';

interface CoreObjectProps {
  core: CoreInstance;
}

export const CoreObject: React.FC<CoreObjectProps> = ({ core }) => {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const currentViewMode = useGameStore((s) => s.currentViewMode);

  const isMine = core.ownerId === localPlayerId;

  // 視点切り替えによるフィルタリング:
  // MY_BOARD: 自分のコアのみ描画
  // OPPONENT_BOARD: 相手のコアのみ反転描画
  if (currentViewMode === 'MY_BOARD' && !isMine) {
    return null;
  }
  if (currentViewMode === 'OPPONENT_BOARD' && isMine) {
    return null;
  }

  const canDrag = isMine && currentViewMode === 'MY_BOARD';

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `core-${core.id}`,
    data: {
      type: 'CORE',
      core,
    },
    disabled: !canDrag,
  });

  const posX = core?.position?.x ?? 50;
  const posY = core?.position?.y ?? 700;
  const isSoul = core.isSoulCore;

  // 視点に応じた表示座標:
  // 自陣: (x, y)
  // 相手陣: (1414 - x - coreSize, 1000 - y - coreSize)
  const coreSize = isSoul ? SOUL_CORE_SIZE : CORE_SIZE;
  const displayX = isMine ? posX : Math.max(0, Math.min(BOARD_WIDTH - coreSize, BOARD_WIDTH - posX - coreSize));
  const displayY = isMine ? posY : Math.max(0, Math.min(BOARD_HEIGHT - coreSize, BOARD_HEIGHT - posY - coreSize));

  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: 'absolute',
        left: `${displayX}px`,
        top: `${displayY}px`,
        width: `${coreSize}px`,
        height: `${coreSize}px`,
        borderRadius: '50%',
        cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
        // 描画順: カード (10~50) より確実に上面 (100~200) に表示
        zIndex: isDragging ? 9999 : (core?.position?.zIndex ?? 100),
        // DragOverlayだけを表示し、元のコアの残像を完全に消す。
        opacity: isDragging ? 0 : 1,
        // リッチなジェム風グラデーション & 透過グロー
        background: isSoul
          ? 'radial-gradient(circle at 35% 35%, #f3e8ff 0%, #c084fc 40%, #7e22ce 100%)'
          : isMine
          ? 'radial-gradient(circle at 35% 35%, #e0f2fe 0%, #38bdf8 40%, #0369a1 100%)'
          : 'radial-gradient(circle at 35% 35%, #fee2e2 0%, #f87171 40%, #b91c1c 100%)',
        boxShadow: isSoul
          ? '0 0 10px rgba(192, 132, 252, 0.9), inset -2px -2px 4px rgba(0, 0, 0, 0.6)'
          : isMine
          ? '0 0 8px rgba(56, 189, 248, 0.8), inset -2px -2px 4px rgba(0, 0, 0, 0.6)'
          : '0 0 8px rgba(248, 113, 113, 0.8), inset -2px -2px 4px rgba(0, 0, 0, 0.6)',
        border: isSoul ? '1.5px solid #faf5ff' : '1px solid rgba(255, 255, 255, 0.7)',
        transition: isDragging ? 'none' : 'box-shadow 0.2s',
        touchAction: 'none',
        userSelect: 'none',
        pointerEvents: isDragging ? 'none' : 'auto',
        ...dragStyle,
      }}
      title={isSoul ? 'ソウルコア (ドラッグして自由移動)' : 'コア (ドラッグして自由移動)'}
    />
  );
};
