# 🎴 CodeX 引き継ぎ用マスター指示書 v2 (残存3大課題の完全修正)

## 📌 修正の目的
前回の修正で「画面暗転」と「二重コピー（残像）」は解消されましたが、新たに発生・判明した以下の3つの表示・動作不備をCodeXにて一括修正します。

---

## 🚨 今回修正する 3 大課題と具体的指示

### 1. 相手の盤面が表示されない問題の修正 (`OPPONENT_BOARD`)
- **症状**: 視点切替ボタンで「相手の盤面」に切り替えても、相手が配置したカードやコア、盤面ゾーンが表示されない。
- **原因**: 
  - `cards` や `cores` のフィルタリングロジックで `ownerId !== localPlayerId` のオブジェクトが弾かれている。
  - または 180 度反転計算 (`1000 - x_canonical - width`) の計算式ミスでオブジェクトが画面外（負の座標や 1000 を超える位置）へ飛ばされている。
- **修正指示**:
  1. `InGameScene.tsx` の描画ロジックにおいて、`currentViewMode === 'OPPONENT_BOARD'` 時は `ownerId !== localPlayerId` (相手所有) のオブジェクトを正しく抽出すること。
  2. 描画時の座標変換を以下に統一し、画面外へ飛ぶのを防ぐこと:
     - `x_render = 1000 - card.position.x - CARD_WIDTH` (カード幅例: 64)
     - `y_render = 1000 - card.position.y - CARD_HEIGHT` (カード高さ例: 90)
     - `Math.max(0, Math.min(1000 - width, x_render))` で画面内クランプ処理を入れること。
  3. 公開ゾーン (`FIELD`, `RESERVE`, `LIFE`, `TRASH`) にある相手カード・コアが100%可視化されるように条件式を見直すこと。

---

### 2. 手札・手元ドロワーの開閉とカード表示の連動バグ修正
- **症状**: 手札/手元ドロワーを閉じても、手札の中にあるカードが画面上に残ったまま消えない（または連動しない）。
- **原因**:
  - ドロワーコンポーネントの開閉状態 (`isHandOpen: boolean`) が、`HAND` / `TEMOTO` ゾーンに所属する `CardObject` の表示制御（`display` / `render`）へ伝達されていない。
- **修正指示**:
  1. `isHandOpen` 状態を Store または Props で管理し、ドロワーが閉じている際 (`isHandOpen === false`) は `zone === 'HAND'` および `zone === 'TEMOTO'` のカードオブジェクトを描画しない (`return null`) か、`display: 'none'` で非表示化すること。
  2. ドロワーを開いた際のみ、アニメーションとともに手札カード要素が表示・操作可能となるよう完全に連動させること。

---

### 3. ドラッグ中のカード・コアのオフセット位置ズレ修正
- **症状**: カードやコアをつまんでドラッグを開始した際、カーソル位置から少し離れた位置（ズレたオフセット）に `DragOverlay`（ドラッグプレビュー）が生成される。
- **原因**:
  - `@dnd-kit` の `DragOverlay` において、ポインターが要素を掴んだローカル位置（カーソルと要素左上原点の差分）が計算されず、要素の原点や中心にデフォルト吸着している。
- **修正指示**:
  1. `DndContext` の `onDragStart` 時、掴んだ要素の `active` 座標とポインター座標の相対オフセットを記録、または `@dnd-kit` の `snapCenterToCursor` や `modifiers` を適用すること。
  2. `DragOverlay` 内で描画するゴースト要素の `transform` オフセットを調整し、**ユーザーが掴んだその位置の直下にカード/コアが正しく追従して描画されるよう修正**すること。

---

## 🛠️ 修正対象ファイル
- `src/components/InGameScene.tsx`: 相手盤面フィルタリング、手札ドロワー開閉とカード連動、`DragOverlay` オフセット調整
- `src/components/CardObject.tsx`: 180度反転時のクランプ判定、手札開閉表示フラグ対応
- `src/components/CoreObject.tsx`: `DragOverlay` 時のオフセット・ポインター追従修正
- `src/store/gameStore.ts`: ドロワー開閉状態 (`isHandOpen`) の保持とアクション制御
