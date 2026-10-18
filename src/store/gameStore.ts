/**
 * BS Simulator - Game State Store (Zustand)
 * Owner Authoritative & Virtual Coordinate System (1000x1000)
 * v3: Full Physical Token Cores, Free Movement, Layering (Card < Core), Dynamic AABB counting, Robust Null-safety.
 */

import { create } from 'zustand';
import {
  PlayerId,
  CardInstance,
  CoreInstance,
  PlayerResourceState,
  ZoneType,
  VirtualPosition,
  ZoneBounds,
  P2PMessage,
  DeckData,
  DeckItem,
  BoardViewMode,
} from '../types';

// 単一1000x1000メインキャンバスのゾーン定義 (画面全域フルレイアウト)
export const VIRTUAL_ZONES: ZoneBounds[] = [
  // 左サイドバー (x: 20, width: 140)
  { zone: 'BURST', x: 20, y: 30, width: 140, height: 260, name: 'バースト' },
  { zone: 'LIFE', x: 20, y: 310, width: 140, height: 320, name: 'ライフ' },
  { zone: 'RESERVE', x: 20, y: 650, width: 140, height: 320, name: 'リザーブ' },

  // 右サイドバー (x: 840, width: 140)
  { zone: 'DECK', x: 840, y: 170, width: 140, height: 260, name: 'デッキ' },
  { zone: 'TRASH', x: 840, y: 450, width: 140, height: 260, name: 'トラッシュ' },
  { zone: 'TRASH_CORE', x: 840, y: 730, width: 140, height: 240, name: 'コアトラッシュ' },

  // 下部ドロワー領域 (手元 & 手札)
  { zone: 'TEMOTO', x: 180, y: 800, width: 220, height: 170, name: '手元 (公開)' },
  { zone: 'HAND', x: 400, y: 800, width: 420, height: 170, name: '手札 (非公開)' },

  // 中央メインフィールド (広大キャンバス)
  { zone: 'FIELD', x: 180, y: 30, width: 640, height: 750, name: 'フィールド' },
];

const SHARED_CARD_ZONES = new Set<ZoneType>(['FIELD', 'TEMOTO', 'TRASH', 'BURST']);

const sharesCardDetails = (zone: ZoneType) => SHARED_CARD_ZONES.has(zone);

const toSharedCard = (card: CardInstance) => ({
  cardId: card.cardId,
  name: card.name,
  dataUrl: card.dataUrl,
  backDataUrl: card.backDataUrl,
  physicalState: card.physicalState,
  visibility: card.visibility,
});

const toSyncedCard = (card: CardInstance): CardInstance =>
  card.zone === 'HAND'
    ? {
        ...card,
        cardId: 'opponent_card',
        name: '非公開',
        dataUrl: undefined,
        backDataUrl: null,
        visibility: 'PRIVATE_OWNER',
        physicalState: 'FACE_DOWN',
      }
    : card;

// Pure Mathematical AABB Hit Testing
export function detectZoneFromPosition(pos: VirtualPosition): ZoneType {
  for (const bounds of VIRTUAL_ZONES) {
    if (
      pos.x >= bounds.x &&
      pos.x <= bounds.x + bounds.width &&
      pos.y >= bounds.y &&
      pos.y <= bounds.y + bounds.height
    ) {
      return bounds.zone;
    }
  }
  return 'FIELD';
}

interface GameState {
  localPlayerId: PlayerId;
  currentViewMode: BoardViewMode; // 'MY_BOARD' | 'OPPONENT_BOARD'
  isExDrawerOpen: boolean;
  isToolMenuOpen: boolean;
  selectedCardForAction: CardInstance | null;

  cards: Record<string, CardInstance>;
  deckQueues: Record<PlayerId, CardInstance[]>;
  deckCounts: Record<PlayerId, number>;
  cores: Record<string, CoreInstance>;
  players: Record<PlayerId, PlayerResourceState>;
  myDeck: DeckData | null;

  p2pSendCallback?: (msg: P2PMessage) => void;

  // 初期化・セットアップ
  initStore: (localPlayerId: PlayerId, p2pSendCallback: (msg: P2PMessage) => void) => void;
  setLocalDeck: (deck: DeckData) => void;
  setupInGame: () => void;

  // 視点切り替え
  toggleViewMode: () => void;
  setViewMode: (mode: BoardViewMode) => void;

  // UI制御
  setExDrawerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setToolMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setSelectedCardForAction: (card: CardInstance | null) => void;

  // カード・コアの物理自由移動アクション
  moveCard: (instanceId: string, position: VirtualPosition) => void;
  moveCore: (coreId: string, position: VirtualPosition) => void;
  flipCard: (instanceId: string) => void;
  rotateCard: (instanceId: string) => void;

  // ゲーム進行
  drawCard: (dest: 'HAND' | 'FIELD', fromBottom?: boolean) => void;
  shuffleDeck: () => void;
  returnToDeck: (instanceId: string, position: 'TOP' | 'BOTTOM') => void;
  spawnExCard: (card: DeckItem, position: VirtualPosition) => void;
  refreshStep: () => void;
  changeCount: (delta: number) => void;
  addCoreToReserve: () => void;
  removeCoreFromReserve: () => void;
  addLifeCore: () => void;
  removeLifeCore: () => void;
  resetBoard: () => void;
  syncBoardState: () => void;

  // 動的コアカウント計算 (AABB 重複判定)
  getAttachedCoresInfo: (card: CardInstance) => { count: number; hasSoulCore: boolean };

  // P2P 受信同期
  applyP2PMessage: (msg: P2PMessage) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  localPlayerId: '1P',
  currentViewMode: 'MY_BOARD',
  isExDrawerOpen: false,
  isToolMenuOpen: false,
  selectedCardForAction: null,

  cards: {},
  deckQueues: { '1P': [], '2P': [] },
  deckCounts: { '1P': 0, '2P': 0 },
  cores: {},
  players: {
    '1P': { playerId: '1P', name: 'Player 1', life: 5, reserveCores: 4, trashCores: 0, voidCores: 100, count: 0 },
    '2P': { playerId: '2P', name: 'Player 2', life: 5, reserveCores: 4, trashCores: 0, voidCores: 100, count: 0 },
  },
  myDeck: null,

  initStore: (localPlayerId, p2pSendCallback) => {
    set({ localPlayerId, p2pSendCallback });
  },

  setLocalDeck: (deck) => {
    set({ myDeck: deck });
  },

  toggleViewMode: () => {
    set((s) => ({
      currentViewMode: s.currentViewMode === 'MY_BOARD' ? 'OPPONENT_BOARD' : 'MY_BOARD',
    }));
  },

  setViewMode: (mode) => {
    set({ currentViewMode: mode });
  },

  setExDrawerOpen: (val) =>
    set((s) => ({ isExDrawerOpen: typeof val === 'function' ? val(s.isExDrawerOpen) : val })),
  setToolMenuOpen: (val) =>
    set((s) => ({ isToolMenuOpen: typeof val === 'function' ? val(s.isToolMenuOpen) : val })),
  setSelectedCardForAction: (card) => set({ selectedCardForAction: card }),

  setupInGame: () => {
    const { localPlayerId, myDeck, p2pSendCallback } = get();
    const pid = localPlayerId;

    // 1. 物理コアの初期配置:
    // - ライフゾーン (x: 40~100, y: 360~560) に通常コア5個
    // - リザーブゾーン (x: 40~100, y: 700~900) にソウルコア1個 + 通常コア3個
    const initialCores: Record<string, CoreInstance> = {};

    // ライフの5コア
    for (let i = 0; i < 5; i++) {
      const coreId = `${pid}_life_core_${i}`;
      initialCores[coreId] = {
        id: coreId,
        ownerId: pid,
        isSoulCore: false,
        zone: 'LIFE',
        position: {
          x: 45 + (i % 2) * 45,
          y: 360 + Math.floor(i / 2) * 55,
          zIndex: 100 + i,
        },
      };
    }

    // リザーブのソウルコア (紫)
    const soulCoreId = `${pid}_soul_core`;
    initialCores[soulCoreId] = {
      id: soulCoreId,
      ownerId: pid,
      isSoulCore: true,
      zone: 'RESERVE',
      position: { x: 45, y: 700, zIndex: 110 },
    };

    // リザーブの通常コア 3個 (青)
    for (let i = 0; i < 3; i++) {
      const coreId = `${pid}_res_core_${i}`;
      initialCores[coreId] = {
        id: coreId,
        ownerId: pid,
        isSoulCore: false,
        zone: 'RESERVE',
        position: {
          x: 45 + ((i + 1) % 2) * 45,
          y: 700 + Math.floor((i + 1) / 2) * 55,
          zIndex: 100 + i,
        },
      };
    }

    // 2. 実カードは非表示キューで管理し、盤面には裏向きダミー1枚だけを置く。
    const deckCards = myDeck?.cards && myDeck.cards.length > 0
      ? [...myDeck.cards]
      : Array.from({ length: 40 }, (_, i) => ({
          id: `default_${i}`,
          templateId: `def_${i}`,
          name: `カード ${i + 1}`,
          dataUrl: '',
          backDataUrl: null,
        }));

    const deckQueue = [...deckCards].sort(() => Math.random() - 0.5).map((c, idx) => {
      const instanceId = `${pid}_deck_${idx}_${Date.now()}`;
      return {
        instanceId,
        cardId: c.templateId,
        name: c.name,
        dataUrl: c.dataUrl,
        backDataUrl: c.backDataUrl,
        ownerId: pid,
        zone: 'DECK',
        position: { x: 855, y: 185, zIndex: 10 },
        visibility: 'HIDDEN_ALL',
        physicalState: 'FACE_DOWN',
        attachedCores: 0,
        attachedSoulCore: false,
      };
    });

    const deckPlaceholder: CardInstance = {
      instanceId: `${pid}_deck_placeholder`,
      cardId: 'deck_placeholder',
      name: 'デッキ',
      ownerId: pid,
      zone: 'DECK',
      position: { x: 855, y: 185, zIndex: 10 },
      visibility: 'HIDDEN_ALL',
      physicalState: 'FACE_DOWN',
      attachedCores: 0,
      attachedSoulCore: false,
      isDeckPlaceholder: true,
    };

    set((state) => ({
      cards: {
        ...Object.fromEntries(
          Object.entries(state.cards).filter(([, card]) => card.ownerId !== pid)
        ),
        [deckPlaceholder.instanceId]: deckPlaceholder,
      },
      deckQueues: { ...state.deckQueues, [pid]: deckQueue },
      deckCounts: { ...state.deckCounts, [pid]: deckQueue.length },
      cores: {
        ...Object.fromEntries(
          Object.entries(state.cores).filter(([, core]) => core.ownerId !== pid)
        ),
        ...initialCores,
      },
      currentViewMode: 'MY_BOARD',
    }));

    // 初期オブジェクトをP2P同期
    p2pSendCallback?.({
      type: 'MOVE_CARD',
      senderId: pid,
      instanceId: deckPlaceholder.instanceId,
      targetZone: 'DECK',
      position: deckPlaceholder.position,
      timestamp: Date.now(),
    });

    p2pSendCallback?.({
      type: 'DECK_COUNT',
      senderId: pid,
      count: deckQueue.length,
      timestamp: Date.now(),
    });

    Object.values(initialCores).forEach((core) => {
      p2pSendCallback?.({
        type: 'MOVE_CORE',
        senderId: pid,
        coreId: core.id,
        position: core.position,
        targetZone: core.zone,
        timestamp: Date.now(),
      });
    });
    get().syncBoardState();
  },

  syncBoardState: () => {
    const { cards, cores, deckQueues, localPlayerId, p2pSendCallback } = get();
    const ownCards = Object.fromEntries(
      Object.entries(cards)
        .filter(([, card]) => card.ownerId === localPlayerId)
        .map(([id, card]) => [id, toSyncedCard(card)])
    );
    const ownCores = Object.fromEntries(
      Object.entries(cores).filter(([, core]) => core.ownerId === localPlayerId)
    );
    p2pSendCallback?.({
      type: 'SYNC_MASTER_STATE',
      senderId: localPlayerId,
      cards: ownCards,
      cores: ownCores,
      deckCount: deckQueues[localPlayerId]?.length ?? 0,
      timestamp: Date.now(),
    });
  },

  /**
   * カードの移動アクション (Z-Index: 10〜50, コアより必ず背面)
   */
  moveCard: (instanceId, position) => {
    const { cards, localPlayerId, p2pSendCallback } = get();
    const targetCard = cards[instanceId];

    if (!targetCard || targetCard.ownerId !== localPlayerId || targetCard.isDeckPlaceholder) {
      console.warn(`[Permission Denied] Cannot move card ${instanceId}`);
      return;
    }

    const safePos: VirtualPosition = {
      x: Math.max(0, Math.min(936, Math.round(position?.x ?? 500))),
      y: Math.max(0, Math.min(910, Math.round(position?.y ?? 500))),
      zIndex: Math.max(10, Math.min(50, (position?.zIndex ?? 10))),
    };

    const detectedZone = detectZoneFromPosition(safePos);

    // デッキ領域へ戻したカードは盤面に積まず、非表示キューへ戻す。
    if (detectedZone === 'DECK') {
      get().returnToDeck(instanceId, 'TOP');
      return;
    }

    let nextVisibility = targetCard.visibility;
    let nextPhysicalState = targetCard.physicalState;

    if (detectedZone === 'FIELD' || detectedZone === 'TRASH' || detectedZone === 'TEMOTO') {
      nextVisibility = 'PUBLIC';
      if (nextPhysicalState === 'FACE_DOWN') {
        nextPhysicalState = 'FACE_UP';
      }
    } else if (detectedZone === 'BURST') {
      nextVisibility = 'PRIVATE_OWNER';
      nextPhysicalState = 'FACE_DOWN';
    } else if (detectedZone === 'HAND') {
      nextVisibility = 'PRIVATE_OWNER';
    }

    const updatedCard: CardInstance = {
      ...targetCard,
      position: safePos,
      zone: detectedZone,
      visibility: nextVisibility,
      physicalState: nextPhysicalState,
    };

    set((state) => ({
      cards: {
        ...state.cards,
        [instanceId]: updatedCard,
      },
    }));

    p2pSendCallback?.({
      type: 'MOVE_CARD',
      senderId: localPlayerId,
      instanceId,
      targetZone: detectedZone,
      position: safePos,
      sharedCard: sharesCardDetails(detectedZone) ? toSharedCard(updatedCard) : undefined,
      timestamp: Date.now(),
    });
    get().syncBoardState();
  },

  /**
   * コアの自由配置移動アクション (Z-Index: 100〜200, カードの上に重なる)
   */
  moveCore: (coreId, position) => {
    const { cores, localPlayerId, p2pSendCallback } = get();
    const targetCore = cores[coreId];

    if (!targetCore || targetCore.ownerId !== localPlayerId) {
      console.warn(`[Permission Denied] Cannot move core ${coreId}`);
      return;
    }

    const safePos: VirtualPosition = {
      x: Math.max(0, Math.min(980, Math.round(position?.x ?? 500))),
      y: Math.max(0, Math.min(980, Math.round(position?.y ?? 500))),
      zIndex: Math.max(100, Math.min(200, (position?.zIndex ?? 100))),
    };

    const detectedZone = detectZoneFromPosition(safePos);

    set((state) => ({
      cores: {
        ...state.cores,
        [coreId]: {
          ...state.cores[coreId],
          position: safePos,
          zone: detectedZone,
        },
      },
    }));

    p2pSendCallback?.({
      type: 'MOVE_CORE',
      senderId: localPlayerId,
      coreId,
      position: safePos,
      targetZone: detectedZone,
      timestamp: Date.now(),
    });
    get().syncBoardState();
  },

  /**
   * カードのAABB領域に重なっているコアを動的に検出してカウント
   */
  getAttachedCoresInfo: (card: CardInstance) => {
    const { cores } = get();
    const cardLeft = card.position.x;
    const cardTop = card.position.y;
    const cardRight = cardLeft + 64;
    const cardBottom = cardTop + 90;

    let count = 0;
    let hasSoulCore = false;

    Object.values(cores).forEach((core) => {
      if (core.ownerId !== card.ownerId) return;
      const coreCenterX = core.position.x + 10;
      const coreCenterY = core.position.y + 10;

      // コアの中心点がカードの矩形内に重なっているか判定
      if (
        coreCenterX >= cardLeft &&
        coreCenterX <= cardRight &&
        coreCenterY >= cardTop &&
        coreCenterY <= cardBottom
      ) {
        count++;
        if (core.isSoulCore) {
          hasSoulCore = true;
        }
      }
    });

    return { count, hasSoulCore };
  },

  flipCard: (instanceId) => {
    const { cards, localPlayerId, p2pSendCallback } = get();
    const targetCard = cards[instanceId];
    if (!targetCard || targetCard.ownerId !== localPlayerId || targetCard.isDeckPlaceholder) return;

    const nextPhysicalState = targetCard.physicalState === 'FACE_UP' ? 'FACE_DOWN' : 'FACE_UP';
    const nextVisibility = nextPhysicalState === 'FACE_DOWN' ? 'PRIVATE_OWNER' : 'PUBLIC';

    set((state) => ({
      cards: {
        ...state.cards,
        [instanceId]: {
          ...state.cards[instanceId],
          physicalState: nextPhysicalState,
          visibility: nextVisibility,
        },
      },
      selectedCardForAction: state.selectedCardForAction?.instanceId === instanceId
        ? {
            ...state.selectedCardForAction,
            physicalState: nextPhysicalState,
            visibility: nextVisibility,
          }
        : state.selectedCardForAction,
    }));

    p2pSendCallback?.({
      type: 'FLIP_CARD',
      senderId: localPlayerId,
      instanceId,
      physicalState: nextPhysicalState,
      visibility: nextVisibility,
      timestamp: Date.now(),
    });
    get().syncBoardState();
  },

  rotateCard: (instanceId) => {
    const { cards, localPlayerId, p2pSendCallback } = get();
    const targetCard = cards[instanceId];
    if (!targetCard || targetCard.ownerId !== localPlayerId || targetCard.isDeckPlaceholder) return;

    const currentAngle = targetCard.rotationAngle ?? (targetCard.physicalState === 'RESTED_90' ? 90 : 0);
    const nextAngle = ((currentAngle + 90) % 360) as 0 | 90 | 180 | 270;

    set((state) => ({
      cards: {
        ...state.cards,
        [instanceId]: {
          ...state.cards[instanceId],
          rotationAngle: nextAngle,
        },
      },
      selectedCardForAction: state.selectedCardForAction?.instanceId === instanceId
        ? {
            ...state.selectedCardForAction,
            rotationAngle: nextAngle,
          }
        : state.selectedCardForAction,
    }));

    p2pSendCallback?.({
      type: 'ROTATE_CARD',
      senderId: localPlayerId,
      instanceId,
      physicalState: targetCard.physicalState,
      rotationAngle: nextAngle,
      timestamp: Date.now(),
    });
    get().syncBoardState();
  },

  drawCard: (dest, fromBottom = false) => {
    const { deckQueues, localPlayerId, p2pSendCallback } = get();
    const deckQueue = deckQueues[localPlayerId] ?? [];

    if (deckQueue.length === 0) {
      alert('山札がありません');
      return;
    }

    const cardToDraw = fromBottom ? deckQueue[0] : deckQueue[deckQueue.length - 1];
    const remainingDeck = fromBottom ? deckQueue.slice(1) : deckQueue.slice(0, -1);
    const targetZone: ZoneType = dest === 'FIELD' ? 'FIELD' : 'HAND';
    const targetPos: VirtualPosition =
      dest === 'FIELD'
        ? { x: 450, y: 350, zIndex: 10 }
        : { x: 530 + Math.random() * 150, y: 830, zIndex: 10 };

    const physicalState = 'FACE_UP';
    const visibility = dest === 'FIELD' ? 'PUBLIC' : 'PRIVATE_OWNER';

    const updatedCard: CardInstance = {
      ...cardToDraw,
      zone: targetZone,
      position: targetPos,
      physicalState,
      visibility,
    };

    set((state) => ({
      cards: {
        ...state.cards,
        [cardToDraw.instanceId]: updatedCard,
      },
      deckQueues: { ...state.deckQueues, [localPlayerId]: remainingDeck },
      deckCounts: { ...state.deckCounts, [localPlayerId]: remainingDeck.length },
    }));

    p2pSendCallback?.({
      type: 'MOVE_CARD',
      senderId: localPlayerId,
      instanceId: cardToDraw.instanceId,
      targetZone,
      position: targetPos,
      sharedCard: sharesCardDetails(targetZone) ? toSharedCard(updatedCard) : undefined,
      timestamp: Date.now(),
    });
    p2pSendCallback?.({
      type: 'DECK_COUNT',
      senderId: localPlayerId,
      count: remainingDeck.length,
      timestamp: Date.now(),
    });
    get().syncBoardState();
  },

  shuffleDeck: () => {
    const { deckQueues, localPlayerId } = get();
    const shuffled = [...(deckQueues[localPlayerId] ?? [])].sort(() => Math.random() - 0.5);

    set((state) => ({
      deckQueues: { ...state.deckQueues, [localPlayerId]: shuffled },
      deckCounts: { ...state.deckCounts, [localPlayerId]: shuffled.length },
    }));
    get().syncBoardState();

  },

  returnToDeck: (instanceId, position) => {
    const { cards, deckQueues, localPlayerId, p2pSendCallback } = get();
    const card = cards[instanceId];
    if (!card || card.ownerId !== localPlayerId || card.isDeckPlaceholder) return;

    const returnedCard: CardInstance = {
      ...card,
      zone: 'DECK',
      position: { x: 855, y: 185, zIndex: 10 },
      physicalState: 'FACE_DOWN',
      visibility: 'HIDDEN_ALL',
    };
    const currentDeck = deckQueues[localPlayerId] ?? [];
    const nextDeck = position === 'TOP' ? [...currentDeck, returnedCard] : [returnedCard, ...currentDeck];

    set((state) => ({
      cards: Object.fromEntries(Object.entries(state.cards).filter(([id]) => id !== instanceId)),
      deckQueues: { ...state.deckQueues, [localPlayerId]: nextDeck },
      deckCounts: { ...state.deckCounts, [localPlayerId]: nextDeck.length },
      selectedCardForAction: null,
    }));

    p2pSendCallback?.({
      type: 'MOVE_CARD',
      senderId: localPlayerId,
      instanceId,
      targetZone: 'DECK',
      position: returnedCard.position,
      timestamp: Date.now(),
    });
    p2pSendCallback?.({
      type: 'DECK_COUNT',
      senderId: localPlayerId,
      count: nextDeck.length,
      timestamp: Date.now(),
    });
    get().syncBoardState();
  },

  spawnExCard: (cardItem, position) => {
    const { localPlayerId, p2pSendCallback } = get();
    const instanceId = `${localPlayerId}_ex_${Date.now()}`;

    const newCard: CardInstance = {
      instanceId,
      cardId: cardItem.templateId,
      name: cardItem.name,
      dataUrl: cardItem.dataUrl,
      backDataUrl: cardItem.backDataUrl,
      ownerId: localPlayerId,
      zone: 'FIELD',
      position: { ...position, zIndex: 10 },
      visibility: 'PUBLIC',
      physicalState: 'FACE_UP',
      attachedCores: 0,
      attachedSoulCore: false,
    };

    set((state) => ({
      cards: {
        ...state.cards,
        [instanceId]: newCard,
      },
      isExDrawerOpen: false,
    }));

    p2pSendCallback?.({
      type: 'MOVE_CARD',
      senderId: localPlayerId,
      instanceId,
      targetZone: 'FIELD',
      position: newCard.position,
      sharedCard: toSharedCard(newCard),
      timestamp: Date.now(),
    });
  },

  /**
   * リフレッシュステップ:
   * トラッシュのコアをリザーブへ一括移動し、自陣カードの疲労を回復
   */
  refreshStep: () => {
    const { localPlayerId, cores, cards, p2pSendCallback } = get();

    // 1. コアトラッシュゾーンにあるコアをリザーブへ移動
    const updatedCores = { ...cores };
    let resIdx = 0;
    Object.values(cores).forEach((core) => {
      if (core.ownerId === localPlayerId) {
        const inTrash =
          core.zone === 'TRASH_CORE' ||
          (core.position.x >= 840 && core.position.y >= 730);

        if (inTrash) {
          const newPos: VirtualPosition = {
            x: 45 + (resIdx % 2) * 45,
            y: 700 + Math.floor(resIdx / 2) * 50,
            zIndex: 100 + resIdx,
          };
          updatedCores[core.id] = {
            ...core,
            zone: 'RESERVE',
            position: newPos,
          };
          resIdx++;

          p2pSendCallback?.({
            type: 'MOVE_CORE',
            senderId: localPlayerId,
            coreId: core.id,
            position: newPos,
            targetZone: 'RESERVE',
            timestamp: Date.now(),
          });
        }
      }
    });

    // 2. 自陣の疲労カードを全回復
    const updatedCards = { ...cards };
    Object.values(cards).forEach((card) => {
      if (card.ownerId === localPlayerId && card.physicalState === 'RESTED_90') {
        updatedCards[card.instanceId] = {
          ...card,
          physicalState: 'FACE_UP',
        };
        p2pSendCallback?.({
          type: 'ROTATE_CARD',
          senderId: localPlayerId,
          instanceId: card.instanceId,
          physicalState: 'FACE_UP',
          rotationAngle: 0,
          timestamp: Date.now(),
        });
      }
    });

    set({ cores: updatedCores, cards: updatedCards });
    get().syncBoardState();
  },

  changeCount: (delta) => {
    const { localPlayerId, players, p2pSendCallback } = get();
    const current = players[localPlayerId]?.count ?? 0;
    const next = Math.max(0, current + delta);

    set((state) => ({
      players: {
        ...state.players,
        [localPlayerId]: {
          ...state.players[localPlayerId],
          count: next,
        },
      },
    }));

    p2pSendCallback?.({
      type: 'COUNT_CHANGE',
      senderId: localPlayerId,
      targetPlayerId: localPlayerId,
      count: next,
      timestamp: Date.now(),
    });
  },

  addCoreToReserve: () => {
    const { localPlayerId, p2pSendCallback } = get();
    const coreId = `${localPlayerId}_extra_core_${Date.now()}`;
    const newCore: CoreInstance = {
      id: coreId,
      ownerId: localPlayerId,
      isSoulCore: false,
      zone: 'RESERVE',
      position: {
        x: 45 + Math.random() * 40,
        y: 720 + Math.random() * 50,
        zIndex: 150,
      },
    };

    set((state) => ({
      cores: {
        ...state.cores,
        [coreId]: newCore,
      },
    }));

    p2pSendCallback?.({
      type: 'ADD_CORE',
      senderId: localPlayerId,
      core: newCore,
      timestamp: Date.now(),
    });
    get().syncBoardState();
  },

  removeCoreFromReserve: () => {
    const { localPlayerId, cores, p2pSendCallback } = get();
    const resCores = Object.values(cores).filter(
      (c) => c.ownerId === localPlayerId && c.zone === 'RESERVE' && !c.isSoulCore
    );
    if (resCores.length === 0) return;

    const target = resCores[resCores.length - 1];
    const updated = { ...cores };
    delete updated[target.id];

    set({ cores: updated });

    p2pSendCallback?.({
      type: 'REMOVE_CORE',
      senderId: localPlayerId,
      coreId: target.id,
      timestamp: Date.now(),
    });
    get().syncBoardState();
  },

  addLifeCore: () => {
    const { localPlayerId, cores, p2pSendCallback } = get();
    const lifeCount = Object.values(cores).filter(
      (core) => core.ownerId === localPlayerId && core.zone === 'LIFE'
    ).length;
    const core: CoreInstance = {
      id: `${localPlayerId}_life_extra_${Date.now()}`,
      ownerId: localPlayerId,
      isSoulCore: false,
      zone: 'LIFE',
      position: {
        x: 45 + (lifeCount % 2) * 45,
        y: 360 + Math.floor(lifeCount / 2) * 55,
        zIndex: 120 + lifeCount,
      },
    };
    set((state) => ({ cores: { ...state.cores, [core.id]: core } }));
    p2pSendCallback?.({ type: 'ADD_CORE', senderId: localPlayerId, core, timestamp: Date.now() });
    get().syncBoardState();
  },

  removeLifeCore: () => {
    const { localPlayerId, cores, p2pSendCallback } = get();
    const lifeCores = Object.values(cores)
      .filter((item) => item.ownerId === localPlayerId && item.zone === 'LIFE' && !item.isSoulCore);
    const core = lifeCores[lifeCores.length - 1];
    if (!core) return;
    set((state) => {
      const nextCores = { ...state.cores };
      delete nextCores[core.id];
      return { cores: nextCores };
    });
    p2pSendCallback?.({ type: 'REMOVE_CORE', senderId: localPlayerId, coreId: core.id, timestamp: Date.now() });
    get().syncBoardState();
  },

  resetBoard: () => {
    get().setupInGame();
  },

  applyP2PMessage: (msg) => {
    const { localPlayerId } = get();
    if (msg.senderId === localPlayerId) return;

    switch (msg.type) {
      case 'HANDSHAKE_DECK': {
        break;
      }

      case 'DECK_COUNT': {
        const safeCount = Number.isFinite(msg.count) ? Math.max(0, Math.floor(msg.count)) : 0;
        set((state) => ({
          deckCounts: { ...state.deckCounts, [msg.senderId]: safeCount },
        }));
        break;
      }

      case 'SYNC_MASTER_STATE': {
        const safeDeckCount = Number.isFinite(msg.deckCount) ? Math.max(0, Math.floor(msg.deckCount)) : 0;
        set((state) => ({
          cards: {
            ...Object.fromEntries(
              Object.entries(state.cards).filter(([, card]) => card.ownerId === localPlayerId)
            ),
            ...msg.cards,
          },
          cores: {
            ...Object.fromEntries(
              Object.entries(state.cores).filter(([, core]) => core.ownerId === localPlayerId)
            ),
            ...msg.cores,
          },
          deckCounts: { ...state.deckCounts, [msg.senderId]: safeDeckCount },
        }));
        break;
      }

      case 'MOVE_CARD': {
        set((state) => {
          const existing = state.cards[msg.instanceId];
          // 実デッキは各端末の非表示キューだけで管理する。相手側ではダミー1枚のみ残す。
          if (msg.targetZone === 'DECK' && !existing && !msg.instanceId.endsWith('_deck_placeholder')) {
            return state;
          }
          if (msg.targetZone === 'DECK' && existing && !existing.isDeckPlaceholder) {
            const cards = { ...state.cards };
            delete cards[msg.instanceId];
            return { cards };
          }
          const sharedCard = msg.sharedCard;
          const updatedCard: CardInstance = {
            instanceId: msg.instanceId,
            cardId: sharedCard?.cardId ?? 'opponent_card',
            name: sharedCard?.name ?? '非公開',
            dataUrl: sharedCard?.dataUrl,
            backDataUrl: sharedCard?.backDataUrl ?? null,
            ownerId: msg.senderId,
            zone: msg.targetZone,
            position: msg.position,
            visibility: sharedCard?.visibility ?? 'PRIVATE_OWNER',
            physicalState: sharedCard?.physicalState ?? 'FACE_DOWN',
            attachedCores: existing?.attachedCores ?? 0,
            attachedSoulCore: existing?.attachedSoulCore ?? false,
            attachedBraveIds: existing?.attachedBraveIds,
            isDeckPlaceholder: msg.instanceId.endsWith('_deck_placeholder'),
          };

          return {
            cards: {
              ...state.cards,
              [msg.instanceId]: updatedCard,
            },
          };
        });
        break;
      }

      case 'MOVE_CORE': {
        set((state) => {
          const existing = state.cores[msg.coreId];
          const updatedCore: CoreInstance = existing
            ? {
                ...existing,
                position: msg.position,
                zone: msg.targetZone || existing.zone,
              }
            : {
                id: msg.coreId,
                ownerId: msg.senderId,
                isSoulCore: msg.coreId.includes('soul'),
                position: msg.position,
                zone: msg.targetZone || 'FIELD',
              };

          return {
            cores: {
              ...state.cores,
              [msg.coreId]: updatedCore,
            },
          };
        });
        break;
      }

      case 'ADD_CORE': {
        set((state) => ({
          cores: {
            ...state.cores,
            [msg.core.id]: msg.core,
          },
        }));
        break;
      }

      case 'REMOVE_CORE': {
        set((state) => {
          const updated = { ...state.cores };
          delete updated[msg.coreId];
          return { cores: updated };
        });
        break;
      }

      case 'FLIP_CARD': {
        set((state) => {
          const card = state.cards[msg.instanceId];
          if (!card || card.ownerId !== msg.senderId) return state;
          return {
            cards: {
              ...state.cards,
              [msg.instanceId]: {
                ...card,
                physicalState: msg.physicalState,
                visibility: msg.visibility,
              },
            },
          };
        });
        break;
      }

      case 'ROTATE_CARD': {
        set((state) => {
          const card = state.cards[msg.instanceId];
          if (!card || card.ownerId !== msg.senderId) return state;
          return {
            cards: {
              ...state.cards,
              [msg.instanceId]: {
                ...card,
                physicalState: msg.physicalState,
                rotationAngle: msg.rotationAngle,
              },
            },
          };
        });
        break;
      }

      case 'COUNT_CHANGE': {
        set((state) => ({
          players: {
            ...state.players,
            [msg.targetPlayerId]: {
              ...state.players[msg.targetPlayerId],
              count: msg.count,
            },
          },
        }));
        break;
      }

    }
  },
}));
