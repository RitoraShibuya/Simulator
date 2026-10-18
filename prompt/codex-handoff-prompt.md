# 🎴 CodeX 引き継ぎ用マスター指示書 (BS Simulator 完全修正・構築プロンプト)

## 📌 プロジェクト概要と引き継ぎ背景
本プロジェクトは **Vite + React + TypeScript + Zustand + `@dnd-kit/core` + PeerJS** を使用した「バトスピ Web シミュレーター」のPure Frontendアプリです。
前のAIエージェントでの作業中（`antigravity-fix-prompt-v5.md` 適用中）にトークン上限に達したため、CodeX に開発を引き継ぎます。

これまでの試行錯誤を経て確立された**「正しいアーキテクチャ・設計ルール」**と**「未解決の不具合の修正方法」**を以下に完全集約しています。

---

## 🛠️ 1. 基本アーキテクチャ & 設計ルール

1. **1000 × 1000 単一固定仮想座標系**:
   - px や % はロジック・通信・座標計算に使用しない。画面全体を 1 つの `1000 x 1000` 空間とする。
   - 画面の上下2段分割（OPPONENT AREA / YOUR FIELD）は**完全廃止**。1つの広大キャンバスに展開する。
2. **視点切替機能 (`MY_BOARD` / `OPPONENT_BOARD`)**:
   - ヘッダーに `[自分の盤面] / [相手の盤面]` トグルボタンを設置。
   - `MY_BOARD`: 自陣 (`ownerId === localPlayerId`) を正位置 (0度) で描画。
   - `OPPONENT_BOARD`: 相手陣 (`ownerId !== localPlayerId`) を 180 度反転マッピング (`x_render = 1000 - x_canonical - width`, `y_render = 1000 - y_canonical - height`) して描画。
3. **独立した物理コアオブジェクト & 描画順**:
   - コアはカード内の数値ではなく、1000x1000 キャンバス上の独立したクリスタルオブジェクト (`CoreObject.tsx`)。
   - **描画順 (Z-Index)**: カード = 10〜50 / コア = 100〜200 (ドラッグ中 9999)。コアは常にカードの上面に乗る。
   - カード上のコア数は、カードの AABB 領域と物理コア座標の重なりから動的に自動カウント表示する。
4. **ドラッグ＆ドロップ座標計算**:
   - `最終論理座標 = 開始仮想座標 + (delta.x / scale)` の計算式でピタリと配置させる。
   - ドラッグ中 (`isDragging === true`) は元の要素に `opacity: 0` を適用し、`DragOverlay` との残像・二重表示を防止。
5. **UI & ゲームルール**:
   - 操作メニューは画面下部固定ボトムシート (`ActionPanel.tsx`) とする（はみ出し防止）。
   - **ターン表記の完全撤去**: 「YOUR TURN」等のターン概念・制限表示を全廃し、両者がいつでも自由に操作できる完全サンドボックス仕様とする。

---

## 🚨 2. 今回 CodeX で修正・完成させるべき 3 大タスク

### Task 1: 視点切り替え時の暗転（描画クラッシュ）の完全ガード
- **原因**: 相手視点（`OPPONENT_BOARD`）への切替時、未同期データや相手プレイヤー情報 (`players['2P']`) のプロパティ参照エラーで React レンダリングが失敗し、黒画面化している。またスケール計算時のゼロ除算 (`scale = 0`) もガードが必要。
- **指示**:
  1. `InGameScene.tsx` に **React Error Boundary** を設置する。
  2. `players[opponentId] ?? { name: 'Opponent', life: 5, reserveCores: 4, trashCores: 0, voidCores: 100 }` 等の安全なフォールバックを全データ参照箇所に設定する。
  3. `Math.max(0.1, calculatedScale)` でスケールの NaN / ゼロ除算をガードする。

### Task 2: ドラッグ移動中の残像・コピー生成の防止
- **原因**: `@dnd-kit` の `DragOverlay` が表示されている際、元の要素の非表示化が漏れており、少しズレた位置に2つ表示されている。
- **指示**:
  1. `CardObject.tsx` および `CoreObject.tsx` 内で、`isDragging` が `true` の場合にスタイルの `opacity: 0` (または `visibility: hidden`) を確実に適用する。

### Task 3: ターン関係の表記・バッジの完全撤去
- **指示**:
  1. ヘッダーやツールバー、および State 内から「YOUR TURN」「OPPONENT'S TURN」「TURN 1」等の**一切のターン表記・インジケーターを削除**する。
  2. 誰のターンであってもカードやコアの移動、タップが自由に動作するように権限と UI 制御を解放する。

---

## 📦 3. 提供コード構造 (参照用ファイル)

以下のファイルを対象として修正・構築を実行してください：
- `src/types.ts`: 全データ型、Zone定義、P2PMessage Discriminated Union
- `src/store/gameStore.ts`: Zustand ストア、1000x1000 仮想空間管理、AABB重なり判定、視点状態管理
- `src/components/Viewport.tsx`: 1000x1000 レスポンシブビューポート & 座標変換 Context
- `src/components/CardObject.tsx`: カード描画 (Z-Index: 10~50, `isDragging` 時 `opacity: 0`)
- `src/components/CoreObject.tsx`: 物理コア描画 (Z-Index: 100~200, ドラッグ自由移動)
- `src/components/ActionPanel.tsx`: 画面下部固定アクションバー
- `src/components/InGameScene.tsx`: メイン画面、Error Boundary、視点トグル、@dnd-kit DndContext

上記仕様に厳格に従い、型エラーゼロのコードを一括修正・生成してください。
