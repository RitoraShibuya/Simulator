# AntiGravity Fix Prompt: 2P Perspective & Card/Core Interaction Fixes

AntiGravityIDEで生成されたコードに対し、以下の2点の重大不具合を修正するプロンプトです。この内容をそのままAntiGravityに読み込ませて修正を実行させてください。

---

## 🚨 修正指示 1: 2P視点の不自然な全体反転の修正（視点独立レンダリング）

### 1.1 問題の原因
現在、`localPlayerId === '2P'` の時に画面全体（ルートコンテナやInGameScene全体）に `transform: rotate(180deg)` が適用されているため、2Pの画面全体が上下逆さまになり、手札UIやツールバーまで反転してしまう。

### 1.2 正しい仕様（視点独立設計）
- **1P・2Pともに、自分の盤面・手札・UIは常に画面下部（手前）に正常な向き（0度）で表示されるべきである。**
- **相手（対戦相手）の盤面・カードのみが画面上部（奥）に表示される。**

### 1.3 修正手順
1. **`InGameScene.tsx` または `App.tsx` のルートコンテナから全体反転 CSS (`rotate(180deg)`) を完全削除する。**
2. **`gameStore.ts` 内の座標変換ヘルパーを利用して盤面オブジェクトの位置をマッピングする:**
   - 1Pの場合: そのままの仮想座標 (1000x1000) で描画。
   - 2Pの場合: 自分のオブジェクトを画面下部（`y: 500~1000`）、相手のオブジェクトを画面上部（`y: 0~500`）にするため、描画時に `x_local = 1000 - x_canonical`, `y_local = 1000 - y_canonical` に座標反転する。
3. **カードの向き（回転 angle）の制御:**
   - 自分（`ownerId === localPlayerId`）のカード: 常に正位置（`rotate(0deg)`）で描画。
   - 相手（`ownerId !== localPlayerId`）のカード: 対戦相手から見ている演出のため、カード画像を180度回転（`rotate(180deg)`）して描画。

---

## 🚨 修正指示 2: 盤面へのカードプレイ不可 & コア移動不可の修正

### 2.1 カードの盤面ドラッグ＆ドロップ（手札 → フィールド）の修正

#### 原因
`@dnd-kit` の `onDragEnd` イベント発生時に、スクリーンピクセル座標から 1000x1000 仮想座標への変換処理が漏れているか、`moveCard` 呼び出し時に `zone` が `'FIELD'` に変更されず `visibility` が `'PUBLIC'` に更新されていない。

#### 修正手順
1. **Viewport 座標変換関数の実装 (`Viewport.tsx`)**:
   `onDragEnd` でドロップしたスクリーン座標 $(screenX, screenY)$ を Viewport 矩形 $(left, top, width, height)$ から 1000x1000 仮想座標に変換する：
   ```typescript
   const vx = Math.max(0, Math.min(1000, ((screenX - rect.left) / rect.width) * 1000));
   const vy = Math.max(0, Math.min(1000, ((screenY - rect.top) / rect.height) * 1000));
   ```
2. **`moveCard` アクションの呼び出し (`gameStore.ts`)**:
   手札からフィールドにドロップされた際：
   - 仮想 AABB 判定 (`detectZoneFromPosition`) で `zone = 'FIELD'` を検出。
   - カードの `zone` を `'FIELD'`、`visibility` を `'PUBLIC'`、`physicalState` を `'FACE_UP'` に自動更新。

### 2.2 コア移動（リザーブ ↔ カード ↔ ライフ ↔ トラッシュ）の実装完了

#### 原因
`gameStore.ts` 内の `transferCore` 関数がスタブ（ダミー処理）のままになっており、ローカルの Zustand State（`reserveCores`, `life`, `trashCores`, `attachedCores`）が変更されていなかった。

#### 修正手順
1. **`gameStore.ts` の `transferCore` を完全実装に差し替える**（提供済みの最新 `gameStore.ts` を適用）。
   - コア移動元（`fromZone`）から個数を減算。
   - コア移動先（`toZone` / `toCardInstanceId`）へ個数を加算。
   - ローカル State の更新と P2P パケット `TRANSFER_CORE` の同期を行う。
2. **コアのドラッグ＆ドロップ（@dnd-kit Drop Target）の設定 (`CoreObject.tsx`, `CardObject.tsx`)**:
   - コアオブジェクト (`CoreObject`) を Drag Source (`useDraggable`) に設定。
   - 各カードオブジェクト (`CardObject`) および各ゾーン（リザーブ枠、ライフ枠、トラッシュ枠）を Drop Target (`useDroppable`) に設定。
   - コアがカード上にドロップされた場合: `transferCore('RESERVE', 'CARD', 1, undefined, targetCardInstanceId)` を実行。
   - コアがカードからリザーブ上にドロップされた場合: `transferCore('CARD', 'RESERVE', 1, sourceCardInstanceId, undefined)` を実行。

---

## 📝 修正用更新ファイル

最新の修正済み `gameStore.ts` を適用してください。

```typescript
// /src/store/gameStore.ts は提供された最新コードを配置してください
```
