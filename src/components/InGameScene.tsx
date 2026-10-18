/**
 * BS Simulator - InGameScene Component (v4)
 * Full-screen 1414x1000 Canvas with View Switcher.
 * Fixes:
 * - Drag: uses delta + initial card position for accurate drop placement
 * - DragOverlay for visual drag ghost
 * - View switch: coordinate inversion only, no black screen
 * - Full null-safety throughout
 */

import React, { useEffect, useRef, useState, Component } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';
import { Viewport, useViewport } from './Viewport';
import { CardObject } from './CardObject';
import { CoreObject } from './CoreObject';
import { ActionPanel, ZoneActionMenu } from './ActionPanel';
import { ZoomModal } from './ZoomModal';
import { CardInstance, CoreInstance, DeckItem, VirtualPosition, ZoneType } from '../types';
import { BOARD_HEIGHT, BOARD_WIDTH, CARD_HEIGHT, CARD_WIDTH, COMMON_CARD_BACK } from '../board';
import {
  Menu,
  Layers,
  LogOut,
  Plus,
  Minus,
  Eye,
  RotateCcw,
} from 'lucide-react';

interface InGameSceneProps {
  onQuit: () => void;
}

// === Error Boundary: レンダリングクラッシュをキャッチして黒画面化を防ぐ ===
class InGameErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, errorMsg: String(error) };
  }
  componentDidCatch(error: unknown, info: unknown) {
    console.error('[InGameErrorBoundary] Caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#090d16',
            color: '#f87171',
            gap: '16px',
          }}
        >
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>⚠️ 描画エラー</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '400px', textAlign: 'center' }}>
            {this.state.errorMsg}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, errorMsg: '' })}
            style={{
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const InGameScene: React.FC<InGameSceneProps> = ({ onQuit }) => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#090d16',
        overflow: 'hidden',
      }}
    >
      <InGameHeader onQuit={onQuit} />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <InGameErrorBoundary>
          <Viewport>
            <BoardContent onQuit={onQuit} />
          </Viewport>
        </InGameErrorBoundary>
        <FirstPlayerAnnouncement />
      </div>
    </div>
  );
};

const FirstPlayerAnnouncement: React.FC = () => {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const firstPlayerId = useGameStore((s) => s.firstPlayerId);
  const [visible, setVisible] = useState(true);
  const isFirst = localPlayerId === firstPlayerId;

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 20001, display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', backgroundColor: 'rgba(2, 6, 23, 0.22)', animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div
        style={{
          minWidth: 'min(420px, 82vw)', padding: '28px 36px', textAlign: 'center', borderRadius: '18px',
          color: isFirst ? '#fef3c7' : '#e2e8f0', border: `2px solid ${isFirst ? '#fbbf24' : '#cbd5e1'}`,
          background: isFirst ? 'linear-gradient(135deg, rgba(120, 53, 15, 0.96), rgba(69, 26, 3, 0.96))' : 'linear-gradient(135deg, rgba(71, 85, 105, 0.96), rgba(30, 41, 59, 0.96))',
          boxShadow: isFirst ? '0 0 45px rgba(251, 191, 36, 0.55)' : '0 0 45px rgba(203, 213, 225, 0.35)',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '0.15em', opacity: 0.85 }}>
          {isFirst ? 'FIRST PLAYER' : 'SECOND PLAYER'}
        </div>
        <div style={{ fontSize: '38px', fontWeight: 900, marginTop: '8px' }}>
          あなたが{isFirst ? '先攻です' : '後攻です'}
        </div>
      </div>
    </div>
  );
};

// ヘッダーナビゲーションバー (視点切替・退出のみ。ターン管理は完全撤去)
const InGameHeader: React.FC<{ onQuit: () => void }> = ({ onQuit }) => {
  const isToolMenuOpen = useGameStore((s) => s.isToolMenuOpen);
  const setToolMenuOpen = useGameStore((s) => s.setToolMenuOpen);
  const currentViewMode = useGameStore((s) => s.currentViewMode);
  const toggleViewMode = useGameStore((s) => s.toggleViewMode);

  return (
    <div
      style={{
        height: '48px',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => setToolMenuOpen(!isToolMenuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #475569',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Menu size={16} />
          ツール
        </button>

        {/* 視点切替ボタン */}
        <button
          onClick={toggleViewMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: currentViewMode === 'MY_BOARD' ? '#0369a1' : '#b91c1c',
            color: '#fff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow:
              currentViewMode === 'MY_BOARD'
                ? '0 0 12px rgba(3, 105, 161, 0.5)'
                : '0 0 12px rgba(185, 28, 28, 0.5)',
            transition: 'background-color 0.2s',
          }}
        >
          <Eye size={15} />
          {currentViewMode === 'MY_BOARD' ? '自分の盤面' : '相手の盤面'}
        </button>
      </div>

      {/* タイトル */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#38bdf8',
          letterSpacing: '2px',
          opacity: 0.8,
          pointerEvents: 'none',
        }}
      >
        🎴 BS SIMULATOR
      </div>

      <button
        onClick={onQuit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#475569',
          color: '#f8fafc',
          border: 'none',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        <LogOut size={14} />
        退出
      </button>
    </div>
  );
};

// Droppable なゾーン枠コンポーネント (単一キャンバス)
const DroppableZone: React.FC<{
  zone: ZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  countBadge?: number;
  children?: React.ReactNode;
  onClick?: () => void;
}> = ({ zone, x, y, width, height, title, countBadge, children, onClick }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `zone-drop-${zone}`,
    data: { type: 'ZONE', zone },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick ? (event) => {
        event.stopPropagation();
        onClick();
      } : undefined}
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: isOver ? 'rgba(56, 189, 248, 0.22)' : 'rgba(30, 41, 59, 0.45)',
        border: isOver ? '2px solid #38bdf8' : '1.5px dashed rgba(71, 85, 105, 0.45)',
        borderRadius: '8px',
        boxSizing: 'border-box',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.15s ease',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            color: 'rgba(148, 163, 184, 0.55)',
            fontSize: '18px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
          }}
        >
          {title}
        </span>
        {countBadge !== undefined && (
          <span
            style={{
              color: '#38bdf8',
              fontSize: '26px',
              fontWeight: 'bold',
            }}
          >
            {countBadge}
          </span>
        )}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>{children}</div>
    </div>
  );
};

// 1414x1000 仮想空間内の盤面メインコンポーネント
const BoardContent: React.FC<{ onQuit: () => void }> = ({ onQuit }) => {
  const { scale } = useViewport();
  const cards = useGameStore((s) => s.cards || {});
  const deckQueues = useGameStore((s) => s.deckQueues);
  const deckCounts = useGameStore((s) => s.deckCounts);
  const cores = useGameStore((s) => s.cores || {});
  const localPlayerId = useGameStore((s) => s.localPlayerId || '1P');
  const oppPlayerId: '1P' | '2P' = localPlayerId === '1P' ? '2P' : '1P';
  const players = useGameStore((s) => s.players || {});
  const myDeck = useGameStore((s) => s.myDeck);
  const currentViewMode = useGameStore((s) => s.currentViewMode || 'MY_BOARD');
  const firstPlayerId = useGameStore((s) => s.firstPlayerId);

  const isExDrawerOpen = useGameStore((s) => s.isExDrawerOpen);
  const setExDrawerOpen = useGameStore((s) => s.setExDrawerOpen);
  const isToolMenuOpen = useGameStore((s) => s.isToolMenuOpen);
  const setToolMenuOpen = useGameStore((s) => s.setToolMenuOpen);

  const moveCard = useGameStore((s) => s.moveCard);
  const moveCore = useGameStore((s) => s.moveCore);
  const changeCount = useGameStore((s) => s.changeCount);
  const refreshStep = useGameStore((s) => s.refreshStep);
  const resetBoard = useGameStore((s) => s.resetBoard);
  const spawnExCard = useGameStore((s) => s.spawnExCard);

  const selectedCardForAction = useGameStore((s) => s.selectedCardForAction);
  const setSelectedCardForAction = useGameStore((s) => s.setSelectedCardForAction);
  const [zoomCard, setZoomCard] = useState<CardInstance | null>(null);
  const [activeZoneMenu, setActiveZoneMenu] = useState<ZoneActionMenu | null>(null);

  // ドラッグ中のアクティブアイテム（DragOverlay用）
  const [activeItem, setActiveItem] = useState<{
    type: 'CARD' | 'CORE';
    data: CardInstance | CoreInstance;
  } | null>(null);

  // ドラッグ開始時の仮想座標を保持（delta計算ベース）
  const dragStartVirtualPos = useRef<VirtualPosition | null>(null);

  // 確実なドラッグ感知のため PointerSensor + TouchSensor を設定
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // ドラッグ開始ハンドラ: アイテムの初期仮想座標を記録
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'CARD') {
      const card = active.data.current.card as CardInstance;
      dragStartVirtualPos.current = { ...card.position };
      setActiveItem({ type: 'CARD', data: card });
    } else if (active.data.current?.type === 'CORE') {
      const core = active.data.current.core as CoreInstance;
      dragStartVirtualPos.current = { ...core.position };
      setActiveItem({ type: 'CORE', data: core });
    }
  };

  // ドラッグ終了ハンドラ: delta + scale で仮想座標差分を計算
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    setActiveItem(null);

    if (!dragStartVirtualPos.current) return;

    // deltaはスクリーンpx単位 → 仮想座標系に変換するためscaleで割る
    const safeScale = Number.isFinite(scale) ? Math.max(0.1, scale) : 1;
    const virtualDeltaX = delta.x / safeScale;
    const virtualDeltaY = delta.y / safeScale;
    const startPos = dragStartVirtualPos.current;

    if (active.data.current?.type === 'CARD') {
      const card = active.data.current.card as CardInstance;
      const targetPos: VirtualPosition = {
        x: Math.max(0, Math.min(BOARD_WIDTH - CARD_WIDTH, Math.round(startPos.x + virtualDeltaX))),
        y: Math.max(0, Math.min(BOARD_HEIGHT - CARD_HEIGHT, Math.round(startPos.y + virtualDeltaY))),
        zIndex: startPos.zIndex ?? 10,
      };
      moveCard(card.instanceId, targetPos);
    } else if (active.data.current?.type === 'CORE') {
      const core = active.data.current.core as CoreInstance;
      const targetPos: VirtualPosition = {
        x: Math.max(0, Math.min(BOARD_WIDTH - 36, Math.round(startPos.x + virtualDeltaX))),
        y: Math.max(0, Math.min(BOARD_HEIGHT - 36, Math.round(startPos.y + virtualDeltaY))),
        zIndex: startPos.zIndex ?? 100,
      };
      moveCore(core.id, targetPos);
    }

    dragStartVirtualPos.current = null;
  };

  const handleDragCancel = () => {
    setActiveItem(null);
    dragStartVirtualPos.current = null;
  };

  const isShowingMyBoard = currentViewMode === 'MY_BOARD';
  const targetPlayerId = isShowingMyBoard ? localPlayerId : oppPlayerId;
  const isVisibleOwner = (ownerId: string) =>
    isShowingMyBoard ? ownerId === localPlayerId : ownerId !== localPlayerId;
  const visibleCards = Object.values(cards).filter(
    (card): card is CardInstance =>
      Boolean(card) &&
      isVisibleOwner(card.ownerId)
  );
  const visibleCores = Object.values(cores).filter(
    (core): core is CoreInstance => Boolean(core) && isVisibleOwner(core.ownerId)
  );
  const boardPosition = (x: number, y: number, width: number, height: number) =>
    isShowingMyBoard
      ? { x, y }
      : { x: BOARD_WIDTH - x - width, y: BOARD_HEIGHT - y - height };
  const boardCssPosition = (x: number, y: number, width: number, height: number) => {
    const position = boardPosition(x, y, width, height);
    return { left: `${position.x}px`, top: `${position.y}px` };
  };
  const currentResource = players[targetPlayerId] ?? {
    playerId: targetPlayerId,
    name: targetPlayerId === localPlayerId ? 'Player' : 'Opponent',
    life: 5,
    reserveCores: 4,
    trashCores: 0,
    voidCores: 100,
    count: 0,
  };
  const displayedPlayerIsFirst = targetPlayerId === firstPlayerId;

  // ゾーンごとのコア個数を算出
  let reserveCoreCount = 0;
  let lifeCoreCount = 0;
  let trashCoreCount = 0;
  let voidCoreCount = 0;

  Object.values(cores).forEach((c) => {
    if (!c || c.ownerId !== targetPlayerId) return;
    if (c.zone === 'RESERVE') reserveCoreCount++;
    else if (c.zone === 'LIFE') lifeCoreCount++;
    else if (c.zone === 'TRASH_CORE') trashCoreCount++;
    else if (c.zone === 'VOID') voidCoreCount++;
  });

  // デッキ・トラッシュ枚数
  const deckCount = targetPlayerId === localPlayerId
    ? (deckQueues[localPlayerId] ?? []).length
    : (deckCounts[targetPlayerId] ?? 0);
  const myTrashCount = Object.values(cards).filter(
    (c) => c?.ownerId === targetPlayerId && c?.zone === 'TRASH'
  ).length;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div
        onClick={() => {
          setSelectedCardForAction(null);
          setActiveZoneMenu(null);
        }}
        style={{
          width: `${BOARD_WIDTH}px`,
          height: `${BOARD_HEIGHT}px`,
          position: 'relative',
          background: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #0b1120 100%)',
          border: '2px solid #1e293b',
          boxSizing: 'border-box',
        }}
      >
        {/* ========================================================= */}
        {/* 1414x1000 メインキャンバス・ゾーン描画 */}
        {/* ========================================================= */}

        {/* 左サイドバー: バースト */}
        <DroppableZone
          zone="BURST"
          {...boardPosition(20, 30, 180, 240)}
          width={180}
          height={240}
          title={isShowingMyBoard ? 'バースト' : '相手バースト'}
        />

        {/* 左サイドバー: ライフ */}
        <DroppableZone
          zone="LIFE"
          {...boardPosition(20, 290, 180, 230)}
          width={180}
          height={230}
          title={isShowingMyBoard ? 'ライフ' : '相手ライフ'}
          countBadge={lifeCoreCount}
          onClick={isShowingMyBoard ? () => {
            setSelectedCardForAction(null);
            setActiveZoneMenu('LIFE');
          } : undefined}
        />

        {/* 左サイドバー: リザーブ */}
        <DroppableZone
          zone="RESERVE"
          {...boardPosition(20, 540, 180, 230)}
          width={180}
          height={230}
          title={isShowingMyBoard ? 'リザーブ' : '相手リザーブ'}
          countBadge={reserveCoreCount}
        />

        <DroppableZone
          zone="VOID"
          {...boardPosition(20, 790, 180, 180)}
          width={180}
          height={180}
          title={isShowingMyBoard ? 'ボイド' : '相手ボイド'}
          countBadge={voidCoreCount}
          onClick={isShowingMyBoard ? () => {
            setSelectedCardForAction(null);
            setActiveZoneMenu('VOID');
          } : undefined}
        />

        {/* 中央: メインフィールド (広大キャンバス) */}
        <DroppableZone
          zone="FIELD"
          {...boardPosition(220, 30, 950, 750)}
          width={950}
          height={750}
          title={isShowingMyBoard ? 'YOUR FIELD (自陣フィールド)' : 'OPPONENT FIELD (相手フィールド)'}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '48px',
              fontWeight: 900,
              color: 'rgba(255, 255, 255, 0.03)',
              pointerEvents: 'none',
              letterSpacing: '4px',
            }}
          >
            {isShowingMyBoard ? 'YOUR FIELD' : 'OPPONENT FIELD'}
          </div>
        </DroppableZone>

        {/* 右上: 先攻・後攻マーカーとコンパクトなカウント */}
        <div
          style={{
            position: 'absolute',
            ...boardCssPosition(1190, 30, 76, 96),
            width: '76px',
            height: '96px',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            boxSizing: 'border-box',
            color: displayedPlayerIsFirst ? '#fef3c7' : '#e2e8f0',
            border: `2px solid ${displayedPlayerIsFirst ? '#fbbf24' : '#cbd5e1'}`,
            background: displayedPlayerIsFirst ? 'linear-gradient(135deg, #92400e, #78350f)' : 'linear-gradient(135deg, #64748b, #334155)',
            boxShadow: displayedPlayerIsFirst ? '0 0 14px rgba(251,191,36,0.5)' : '0 0 12px rgba(203,213,225,0.32)',
          }}
        >
          <span style={{ fontSize: '22px', lineHeight: 1 }}>{displayedPlayerIsFirst ? '♛' : '♜'}</span>
          <span style={{ fontSize: '16px', fontWeight: 900 }}>{displayedPlayerIsFirst ? '先攻' : '後攻'}</span>
          <span style={{ fontSize: '11px', fontWeight: 700 }}>{displayedPlayerIsFirst ? '1st' : '2nd'}</span>
        </div>

        <div
          style={{
            position: 'absolute',
            ...boardCssPosition(1276, 30, 118, 96),
            width: '118px',
            height: '96px',
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid #334155',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '6px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8' }}>
            {isShowingMyBoard ? 'カウント' : '相手カウント'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8' }}>
            {currentResource?.count ?? 0}
          </div>
          {isShowingMyBoard && (
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                onClick={() => changeCount(-1)}
                style={{
                  backgroundColor: '#334155',
                  color: '#fff',
                  border: 'none',
                  width: '24px',
                  height: '22px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Minus size={12} />
              </button>
              <button
                onClick={() => changeCount(1)}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  width: '24px',
                  height: '22px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={12} />
              </button>
            </div>
          )}
        </div>

        {/* 右サイドバー: デッキ */}
        <DroppableZone
          zone="DECK"
          {...boardPosition(1190, 170, 204, 260)}
          width={204}
          height={260}
          title={isShowingMyBoard ? 'デッキ' : '相手デッキ'}
          countBadge={deckCount}
          onClick={isShowingMyBoard ? () => {
            setSelectedCardForAction(null);
            setActiveZoneMenu('DECK');
          } : undefined}
        />

        {/* 右サイドバー: トラッシュ (カード) */}
        <DroppableZone
          zone="TRASH"
          {...boardPosition(1190, 450, 204, 260)}
          width={204}
          height={260}
          title={isShowingMyBoard ? `トラッシュ (${myTrashCount}枚)` : '相手トラッシュ'}
          countBadge={myTrashCount}
        />

        {/* 右サイドバー: コアトラッシュ */}
        <DroppableZone
          zone="TRASH_CORE"
          {...boardPosition(1190, 730, 204, 240)}
          width={204}
          height={240}
          title={isShowingMyBoard ? 'コアトラッシュ' : '相手コアトラッシュ'}
          countBadge={trashCoreCount}
        />

        {/* 1. カード描画レイヤー (z-index: 10~50, コアより背面) */}
        {visibleCards.map((card) => {
          return (
            <CardObject
              key={card.instanceId}
              card={card}
              onZoom={(c) => setZoomCard(c)}
            />
          );
        })}

        {/* 2. コア描画レイヤー (z-index: 100~200, カードの上面に常に描画) */}
        {visibleCores.map((core) => {
          return <CoreObject key={core.id} core={core} />;
        })}

        {/* 手元 / 手札は常設。背景はカードより背面に描画する。 */}
        {isShowingMyBoard && (
          <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                bottom: '0px',
                left: '220px',
                width: '950px',
                height: '200px',
                backgroundColor: 'rgba(15, 23, 42, 0.98)',
                borderTop: '2px solid #f59e0b',
                borderLeft: '1px solid #334155',
                borderRight: '1px solid #334155',
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                zIndex: 5,
                overflow: 'hidden',
              }}
            >
              <div style={{ width: '320px', borderRight: '1px dashed #475569', position: 'relative' }}>
                <DroppableZone zone="TEMOTO" x={0} y={0} width={320} height={200} title="手元 (公開)" />
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <DroppableZone zone="HAND" x={0} y={0} width={630} height={200} title="手札 (自分のみ非公開)" />
              </div>
          </div>
        )}

        {/* EXデッキドロワー */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: '220px',
            height: `${BOARD_HEIGHT}px`,
            backgroundColor: 'rgba(15, 23, 42, 0.98)',
            borderRight: '2px solid #8b5cf6',
            transform: isExDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 120,
            padding: '16px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #334155',
              paddingBottom: '8px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#c084fc' }}>
              EX デッキ
            </span>
            <button
              onClick={() => setExDrawerOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(myDeck?.exCards || []).map((card: DeckItem, idx: number) => (
              <div
                key={`${card.id}_${idx}`}
                onClick={() =>
                  spawnExCard(card, { x: 300 + (idx % 3) * 70, y: 350, zIndex: 10 })
                }
                style={{
                  width: '100%',
                  height: '70px',
                  backgroundColor: '#2e1065',
                  border: '1.5px solid #a855f7',
                  borderRadius: '6px',
                  backgroundImage: card.dataUrl ? `url(${card.dataUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  padding: '4px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                }}
                title="タップでフィールドに召喚"
              >
                {!card.dataUrl && card.name}
              </div>
            ))}
            {(!myDeck?.exCards || myDeck.exCards.length === 0) && (
              <div style={{ color: '#64748b', fontSize: '11px', textAlign: 'center' }}>
                EXカードなし
              </div>
            )}
          </div>
        </div>

        {/* ツールメニュー */}
        {isToolMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '0px',
              left: '0px',
            width: '280px',
            height: `${BOARD_HEIGHT}px`,
              backgroundColor: 'rgba(15, 23, 42, 0.98)',
              borderRight: '1px solid #334155',
              zIndex: 150,
              padding: '20px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '10px 0 30px rgba(0,0,0,0.7)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #334155',
                paddingBottom: '10px',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#e2e8f0' }}>
                盤面ツールメニュー
              </span>
              <button
                onClick={() => setToolMenuOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <button
              onClick={() => {
                refreshStep();
                setToolMenuOpen(false);
              }}
              style={{
                backgroundColor: '#16a34a',
                color: '#fff',
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <RotateCcw size={16} />
              リフレッシュステップ
            </button>

            <button
              onClick={() => {
                setExDrawerOpen(true);
                setToolMenuOpen(false);
              }}
              style={{
                backgroundColor: '#7c3aed',
                color: '#fff',
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Layers size={16} />
              EXデッキ表示
            </button>

            <button
              onClick={() => {
                resetBoard();
                setToolMenuOpen(false);
              }}
              style={{ backgroundColor: '#b45309', color: '#fff', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
            >
              盤面リセット
            </button>

            <button
              onClick={onQuit}
              style={{
                marginTop: 'auto',
                backgroundColor: '#ef4444',
                color: '#fff',
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              対戦を終了する
            </button>
          </div>
        )}
      </div>

      {/* 画面固定ボトムシート/アクションバー */}
      <ActionPanel
        card={selectedCardForAction}
        zoneMenu={selectedCardForAction ? null : activeZoneMenu}
        onClose={() => {
          setSelectedCardForAction(null);
          setActiveZoneMenu(null);
        }}
        onZoom={(card) => setZoomCard(card)}
      />

      {/* 拡大プレビューモーダル */}
      <ZoomModal card={zoomCard} onClose={() => setZoomCard(null)} />

      {/* DragOverlay: ドラッグ中のゴースト表示 */}
      {createPortal(
        <DragOverlay dropAnimation={null}>
        {activeItem?.type === 'CARD' && (() => {
          const card = activeItem.data as CardInstance;
          const isReversed = card.isFaceDown || card.visibility === 'HIDDEN_ALL';
          const imageUrl = !isReversed && card.currentSide === 'BACK' ? card.backDataUrl : card.dataUrl;
          const rotation = card.rotationAngle ?? 0;
          return (
            <div
              style={{
                // DragOverlayの基準矩形（実画面上のカード寸法）をそのまま使う。
                // CSS scale下でも、掴んだ局所位置をカーソルに維持できる。
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                borderRadius: '6px',
                border: '2px solid #38bdf8',
                backgroundColor: isReversed ? '#111' : '#1e293b',
                backgroundImage: isReversed ? COMMON_CARD_BACK : imageUrl ? `url(${imageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: `rotate(${rotation}deg)`,
                opacity: 0.88,
                boxShadow: '0 14px 30px rgba(0,0,0,0.7), 0 0 20px rgba(56,189,248,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            >
              {isReversed && <span>BS</span>}
            </div>
          );
        })()}
        {activeItem?.type === 'CORE' && (() => {
          const core = activeItem.data as CoreInstance;
          const isSoul = core.isSoulCore;
          const isMineCore = core.ownerId === localPlayerId;
          return (
            <div
              style={{
                // コアも元要素の画面上の寸法に合わせ、scale由来のオフセットをなくす。
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                borderRadius: '50%',
                background: isSoul
                  ? 'radial-gradient(circle at 35% 35%, #f3e8ff 0%, #c084fc 40%, #7e22ce 100%)'
                  : isMineCore
                  ? 'radial-gradient(circle at 35% 35%, #e0f2fe 0%, #38bdf8 40%, #0369a1 100%)'
                  : 'radial-gradient(circle at 35% 35%, #fee2e2 0%, #f87171 40%, #b91c1c 100%)',
                boxShadow: isSoul
                  ? '0 0 14px rgba(192, 132, 252, 0.9)'
                  : '0 0 12px rgba(56, 189, 248, 0.8)',
                border: isSoul ? '1.5px solid #faf5ff' : '1px solid rgba(255,255,255,0.7)',
                opacity: 0.9,
                pointerEvents: 'none',
              }}
            />
          );
        })()}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
};
