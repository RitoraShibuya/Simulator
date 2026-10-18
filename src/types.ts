/**
 * BS Simulator - Core Type Definitions
 * Vite + React + TypeScript + Zustand + PeerJS Architecture
 */

export type PlayerId = '1P' | '2P';

// 可視性と物理状態の2軸管理
export type CardVisibility = 'PUBLIC' | 'PRIVATE_OWNER' | 'HIDDEN_ALL';
export type CardPhysicalState = 'FACE_UP' | 'FACE_DOWN' | 'RESTED_90';

// 盤面ゾーン定義 (手元・コアトラッシュ含む)
export type ZoneType =
  | 'DECK'
  | 'HAND'
  | 'FIELD'
  | 'TRASH'
  | 'BURST'
  | 'VOID'
  | 'RESERVE'
  | 'LIFE'
  | 'TEMOTO'
  | 'TRASH_CORE';

// 1414x1000 仮想座標系における位置情報
export interface VirtualPosition {
  x: number; // 0 ~ 1414
  y: number; // 0 ~ 1000
  zIndex: number;
}

// ゾーンの AABB (Axis-Aligned Bounding Box) 判定用矩形
export interface ZoneBounds {
  zone: ZoneType;
  x: number;      // 0 ~ 1414
  y: number;      // 0 ~ 1000
  width: number;  // 0 ~ 1000
  height: number; // 0 ~ 1000
  name: string;   // 日本語表示名
}

// カードの基本メタデータ (IndexedDBキャッシュ / デッキ用)
export interface CardData {
  id: string;             // 一意識別子 (例: "card_123456")
  templateId?: string;    // 元テンプレートID
  name: string;
  dataUrl?: string;       // WebP圧縮済み画像DataURL (ローカルIndexedDB保存用)
  backDataUrl?: string | null; // 裏面画像WebP
  cost?: number;
  reductionGems?: number;
  type?: 'SPIRIT' | 'BRAVE' | 'NEXUS' | 'MAGIC' | 'BURST';
}

// デッキ保存・インポート用定義
export interface DeckItem {
  id: string;
  templateId: string;
  name: string;
  dataUrl?: string;
  backDataUrl?: string | null;
}

export interface DeckData {
  name: string;
  cards: DeckItem[];
  exCards: DeckItem[];
}

// 盤面上に存在するカードインスタンス（個体）の状態
export interface CardInstance {
  instanceId: string;         // ユニークな個体ID
  cardId: string;             // CardData 参照用ID
  name: string;               // カード名（非公開時は伏せられる）
  dataUrl?: string;           // 画像URL（非公開時は相手に送信されない）
  backDataUrl?: string | null; // 固有裏面画像
  ownerId: PlayerId;          // 所有権保持者 ("1P" | "2P")
  zone: ZoneType;
  position: VirtualPosition;
  visibility: CardVisibility;
  physicalState: CardPhysicalState;
  /** Non-public sleeve state. This is independent from a double-faced card's shown side. */
  isFaceDown: boolean;
  /** Publicly displayed side of a double-faced card. */
  currentSide: 'FRONT' | 'BACK';
  attachedCores: number;      // 乗っている通常コア数
  attachedSoulCore: boolean;  // ソウルコアが乗っているか
  attachedBraveIds?: string[]; // 合体しているブレイヴの instanceId
  isDeckPlaceholder?: boolean; // 実デッキを隠して表示するダミー1枚
  rotationAngle?: 0 | 90 | 180 | 270;
}

// コアのインスタンス
export interface CoreInstance {
  id: string;
  isSoulCore: boolean;
  ownerId: PlayerId;
  zone: ZoneType;
  position: VirtualPosition;
  attachedCardId?: string;    // 特定カードに乗っている場合
}

// プレイヤーリソース状態
export interface PlayerResourceState {
  playerId: PlayerId;
  name: string;
  life: number;
  reserveCores: number;
  trashCores: number;
  voidCores?: number;
  count: number;              // カウント
}

// 視点表示モード (単一キャンバス視点切替)
export type BoardViewMode = 'MY_BOARD' | 'OPPONENT_BOARD';

// シーン定義
export type AppScene = 'TITLE' | 'DECK_BUILDER' | 'LOBBY' | 'MATCHING' | 'INGAME';

// ----------------------------------------------------------------
// P2P コマンドパケット定義 (Owner Authoritative Event-Driven)
// ----------------------------------------------------------------

export interface BaseCommand {
  senderId: PlayerId;
  timestamp: number;
}

export interface HandshakeDeckCommand extends BaseCommand {
  type: 'HANDSHAKE_DECK';
  deckName: string;
}

export interface DeckCountCommand extends BaseCommand {
  type: 'DECK_COUNT';
  count: number;
}

export interface SyncMasterStateCommand extends BaseCommand {
  type: 'SYNC_MASTER_STATE';
  cards: Record<string, CardInstance>;
  cores: Record<string, CoreInstance>;
  deckCount: number;
}

// 公開ゾーンへ移動した時だけ相手へ渡すカード情報。手札・デッキでは送信しない。
export type SharedCardData = Pick<
  CardInstance,
  'cardId' | 'name' | 'dataUrl' | 'backDataUrl' | 'physicalState' | 'visibility' | 'isFaceDown' | 'currentSide'
>;

export interface MoveCardCommand extends BaseCommand {
  type: 'MOVE_CARD';
  instanceId: string;
  targetZone: ZoneType;
  position: VirtualPosition;
  sharedCard?: SharedCardData;
}

export interface FlipCardCommand extends BaseCommand {
  type: 'FLIP_CARD';
  instanceId: string;
  physicalState: CardPhysicalState;
  visibility: CardVisibility;
  isFaceDown: boolean;
}

export interface RotateCardCommand extends BaseCommand {
  type: 'ROTATE_CARD';
  instanceId: string;
  physicalState: CardPhysicalState;
  rotationAngle: 0 | 90 | 180 | 270;
}

export interface MoveCoreCommand extends BaseCommand {
  type: 'MOVE_CORE';
  coreId: string;
  position: VirtualPosition;
  targetZone?: ZoneType;
}

export interface AddCoreCommand extends BaseCommand {
  type: 'ADD_CORE';
  core: CoreInstance;
}

export interface RemoveCoreCommand extends BaseCommand {
  type: 'REMOVE_CORE';
  coreId: string;
}

export interface CountChangeCommand extends BaseCommand {
  type: 'COUNT_CHANGE';
  targetPlayerId: PlayerId;
  count: number;
}

// P2P通信で送受信される全コマンドの判別可能ユニオン型 (Discriminated Union)
export type P2PMessage =
  | HandshakeDeckCommand
  | DeckCountCommand
  | SyncMasterStateCommand
  | MoveCardCommand
  | FlipCardCommand
  | RotateCardCommand
  | MoveCoreCommand
  | AddCoreCommand
  | RemoveCoreCommand
  | CountChangeCommand
;
