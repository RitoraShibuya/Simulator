# 🎴 BS Simulator (バトスピ Web シミュレーター) 追加不具合修正プロンプト (v5)

AntiGravity (Claude 3.5 Sonnet / GPT-4o) のチャットに以下をそのまま貼り付けて修正を実行させてください。

---

## 🚨 発生している3つの不具合と完全修正指示

### 1. 視点切替時の暗転（黒画面化）の完全防除
- **現象**: 視点を「相手の盤面 (`OPPONENT_BOARD`)」に切り替えた際、画面が暗転（黒画面化）してレンダリングがクラッシュする。
- **原因**: 
  - 受信遅延や未同期データにより `players['2P']` や `cards` の特定プロパティ（`attachedCores`, `position`, `zone` 等）が `undefined` / `null` のままプロパティ参照（`.x` や `.length`）され、Reactのレンダリング例外が発生してコンポーネントツリー全体がアンマウントされている。
  - `Viewport.tsx` のアスペクト比計算で画面リサイズ時に一時的に `width` や `height` が 0 になり、スケールが `NaN` になる。
- **修正指示**:
  1. **React Error Boundary の設置**: `InGameScene.tsx` または `Viewport.tsx` 全体を安全な Error Boundary でラップし、万が一の例外発生時も背景（黒背景のみ）にならずエラー回避コンポーネントで復帰できるようにする。
  2. **完全な Defensive Value (Null Safety)**:
     - `const opponent = players[opponentId] ?? { name: 'Opponent', life: 5, reserveCores: 4, trashCores: 0, voidCores: 100 };` のように必ずフォールバックを置く。
     - オブジェクトの `.map` や `.filter` 処理前に `if (!card || !card.position) return null;` を徹底する。
     - スケール計算で `scale = Math.max(0.1, calculatedScale)` とし、`NaN` や `0` 除算を100%遮断する。

---

### 2. ドラッグ（移動）中に離れた位置にコピー（残像）が生成される問題の解消
- **現象**: カードやコアをドラッグして移動している間、本来の位置から少し離れた場所にコピー（残像・2重表示）が生成される。
- **原因**:
  - `@dnd-kit` の `DragOverlay` を使用している際、ドラッグ中の元ノード（`useDraggable` を当てている元の `CardObject` / `CoreObject`）の非表示化 (`opacity: 0`) が漏れているため、元の場所（またはズレた場所）に実体と `DragOverlay`（ゴースト）の2重描画が発生している。
  - あるいは `DragOverlay` の `transform` 変換にキャンバスの `scale` が2重適用されてオフセットが生じている。
- **修正指示**:
  1. `CardObject.tsx` および `CoreObject.tsx` にて、`isDragging` が `true` の場合は元の要素のスタイルに `opacity: 0` または `visibility: 'hidden'` を適用し、ドラッグ中の元ノードを完全に隠すこと。
  2. もし `DragOverlay` の位置座標がズレる場合は、`DragOverlay` への位置座標計算に `1 / scale` を正しく適用するか、または `DragOverlay` を使わずに `useDraggable` の `transform` (`translate3d`) を直接元の要素へ適用してスムーズに移動させるシンプルな方式に修正すること。

---

### 3. ターン関係の表記の完全撤去
- **現象**: ゲーム開始時に双方の画面に「YOUR TURN (自分のターン)」と表示され不自然。
- **ユーザー要望**: ターンに関する管理・表記（「YOUR TURN」「OPPONENT'S TURN」「ターン切り替えボタン」「ターンバッジ」等）を**すべて完全に削除**する。
- **修正指示**:
  1. ヘッダー、ツールバー、情報パネルから「ターン表示」「TURN 1」「YOUR TURN」「相手のターン」などのあらゆるテキスト・バッジ・表示要素を**完全に撤去**すること。
  2. ターン制限による操作ブロックは行わず、両プレイヤーがいつでも自由かつインタラクティブにカードやコアを動かせる完全デジタルサンドボックス仕様とすること。

---

## 🚀 修正対象ファイル
- `src/components/InGameScene.tsx`
- `src/components/Viewport.tsx`
- `src/components/CardObject.tsx`
- `src/components/CoreObject.tsx`
- `src/store/gameStore.ts`
