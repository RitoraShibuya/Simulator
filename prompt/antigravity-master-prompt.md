# AntiGravity (AI Coding Agent) 一括実装プロンプト & 指示書
## プロジェクト名: BS Simulator (バトスピ Web シミュレーター)

あなたはプロのフルスタックWebエンジニアおよびゲーム開発者です。
仕様書および規定された建築ルール（禁足事項・厳守事項・権限モデル）に基づき、**Vite + React + TypeScript + Zustand** の構成で「バトスピ Web シミュレーター」の完全な本実装コードを一括生成・構築してください。

---

### 1. プロジェクト基本要件 & 技術スタック

* **システム概要**: Webブラウザ上で動作するトレーディングカードゲーム（TCG）シミュレーター。サーバーを介さないP2P（PeerJS / WebRTC DataChannel）リアルタイム通信を採用。
* **主要スタック**:
  * **Frontend Framework**: React 18+ (TypeScript)
  * **Build Tool**: Vite (Zero-Config)
  * **State Management**: Zustand
  * **Drag & Drop**: `@dnd-kit/core` (PCマウス & スマホタッチ統一抽象化)
  * **Local Database**: IndexedDB (`BSGameDB_V3` - カードデータ & WebP画像キャッシュ)
  * **P2P Networking**: PeerJS

---

### 2. 禁足事項 (DONTs - 絶対禁止規則)

1. **DOM直接操作の全面禁止 (NO Direct DOM Manipulation)**
   - `document.getElementById`, `querySelector`, `elementFromPoint`, `classList.add`, `element.style` 等の直接操作・直接座標計算は禁止。描画とUI更新はすべて Zustand State に伴う一方向バインディングで行うこと。
2. **Stateの直接書き換え禁止 (NO Direct State Mutation)**
   - `card.x = 100` 等のミューテーションは禁止。必ず Zustand Store の Action / Reducer を経由すること。
3. **ピクセル絶対座標および通信での%座標使用禁止 (NO Absolute Pixels / % in Logic & Network)**
   - 物理ピクセル (`px`) や画面相対比率 (`%`) をゲームロジックやP2Pパケット内に含めてはならない。盤面座標はすべて「1000 × 1000」の固定仮想座標系（Virtual Coordinate System）で処理すること。
4. **P2Pでの画像バイナリ / Base64 送信禁止 (NO Raw Binary / Base64 in P2P)**
   - P2P DataChannelで Base64 画像（DataURL）を送受信してはならない。カードデータは軽量IDのみを送信し、画像はIndexedDBの事前ハッシュキャッシュから取得すること。
5. **対戦相手への非公開データ露呈禁止 (NO Secret Data Exposure)**
   - 手札、山札、裏向きバーストの実データ（カード名・効果・画像パス）を対戦相手へ送るパケットに含めてはならない。相手には「非公開プレースホルダーID」のみを同期すること。
6. **DOM依存のドロップ判定禁止 (NO Browser DOM-dependent Hit Test)**
   - `elementFromPoint` による判定は禁止。ゾーン判定は仮想座標上の矩形（AABB: Axis-Aligned Bounding Box）数値演算で行うこと。

---

### 3. 厳守事項 (DOs - アーキテクチャ原則)

1. **厳格な TypeScript 型定義 (Strict Type Safety)**
   - すべてのデータモデル（`Card`, `Zone`, `PlayerState`, `P2PMessage` 等）に型を定義し、`any` 型は使用禁止とする。P2Pパケットには Discriminated Unions を適用する。
2. **固定仮想座標系 (1000x1000) & ビューポート行列変換 (Matrix Transformation)**
   - 盤面ロジックは常に `0` 〜 `1000` の固定論理論理空間で計算する。
   - 2P（相手）視点描画時は、コンポーネント個別の反転処理ではなく、ビューポート層で `(X_2p = 1000 - X_1p, Y_2p = 1000 - Y_1p)` の一括トランスフォームを適用すること。
3. **純粋数学的 AABB Hit Testing**
   - カードドロップ時、各ゾーンの境界ボックス（`ZoneBounds`）とカード位置の包含・交差判定を State 内で完結させること。
4. **イベント駆動型コマンドパターン (Event-Driven Command Pattern)**
   - P2P通信は状態そのものの上書きではなく、「操作コマンド（Intent: `MoveCardCommand`, `FlipCardCommand` 等）」を送信し、受信側の Store Reducer で安全に更新すること。
5. **2軸カード状態設計 (Two-Axis Card State Design)**
   - 可視性 (`CardVisibility`: `PUBLIC` / `PRIVATE_OWNER`) と物理状態 (`CardPhysicalState`: `FACE_UP` / `RESTED_90` / `FACE_DOWN`) を独立したフラグとして保持・制御すること。

---

### 4. 権限モデル仕様 (Owner Authoritative Specifications)

1. **オブジェクト所有権 (`ownerId`)**
   - 盤面上のカード・コアは生成時に `ownerId` (`"1P"` | `"2P"`) を付与される。自分が所有権を持つオブジェクトのみ操作コマンドを発行可能とし、相手オブジェクトの直接操作イベントは遮断する。
2. **ゾーン別アクセス権限**
   - 非公開ゾーン（手札・山札・バースト）: 所有者のみ実データを参照・操作（Owner Exclusive）。対戦相手には裏向きオブジェクトの存在・枚数のみ通知。
   - 公開ゾーン（フィールド・トラッシュ・手元）: 所有者が主操作。相手カードに対する操作リクエストは `ACTION_REQUEST` として送信。
3. **P2P同期フロー**
   - ユーザー操作 → ローカル権限チェック → 自クライアント State 更新 & 相手へ `MUTATION_EVENT` コマンドパケット送信 → 受信側で `ownerId` 検証後 State 更新。
4. **Host Arbiter (1P調停)**
   - 1P（部屋作成者）がゲーム進行および競合時の正（Master State）を保持する。

---

### 5. 画面構成 & ゲームゾーン仕様

1. **シーン1: タイトル画面 (`#scene-title`)**: デッキメーカー / 対戦ロビー 選択。
2. **シーン2: デッキメーカー (`#scene-deck-builder`)**:
   - 画像一括追加 & HTML5 Canvas による 300x420 WebP (品質0.6) への自動圧縮保存。
   - メインデッキ (1〜100枚) / EX・契約・トークン枠 (枚数制限なし)。
   - デッキJSON書き出し / 読み込み。
3. **シーン3: 対戦ロビー (`#scene-lobby`)**: デッキ選択、ホスト（部屋作成）/ ゲスト（部屋参加）。
4. **シーン4: マッチング待機 (`#scene-matching`)**: 4桁部屋番号、PeerJS P2Pハンドシェイク。
5. **シーン5: インゲーム対戦 (`#scene-ingame`)**:
   - **ライフゾーン**: 初期5コア自動配置。
   - **リザーブゾーン**: 初期ソウルコア1個 + 通常コア3個自動配置。
   - **バーストゾーン**: 裏向き専用領域。
   - **デッキゾーン**: シャッフル、上/下からのドロー機能。
   - **トラッシュ (カード/コア)**: リフレッシュステップでリザーブへ一括戻し。
   - **フィールドゾーン**: 自由配置領域。
   - **手元 (公開) / 手札 (自分のみ非公開)** ドロワー。
   - **ターン・ステップ管理**: リフレッシュステップ、ステップ切り替え、カウントカウンター (+/-)。

---

### 6. 提供済み基盤型定義 & Storeファイル

既に定義済みの `types.ts` および `gameStore.ts` を標準型および状態管理ストアとして利用してください：
* `types.ts`: `Card`, `Zone`, `PlayerState`, `VirtualPosition`, `P2PMessage` 等の型定義。
* `gameStore.ts`: Zustand による Owner Authoritative 権限チェック付きアクション、1000x1000 仮想座標計算、AABB ゾーン判定処理。

---

### 7. AntiGravity への実装ステップ指示 (Action Plan)

以上の条件を遵守し、以下の順序でReactコンポーネントおよび通信層を一括実装してください：

1. **`src/types.ts` / `src/store/gameStore.ts`**: 提供されたコードをプロジェクトへ配置。
2. **`src/services/db.ts`**: IndexedDB (BSGameDB_V3) の初期化・WebP画像キャッシュ処理サービスの実装。
3. **`src/services/p2p.ts`**: PeerJS を用いたシグナリング & DataChannel コマンド送信ハンドラの実装。
4. **`src/components/Viewport.tsx`**: 1000x1000 仮想空間をレスポンシブにアスペクト比維持で画面フィッティングさせ、2P時に `transform: rotate(180deg)` による一括反転を行うビューポートコンポーネント。
5. **`src/components/CardObject.tsx`**: `@dnd-kit/core` を用いたドラッグ＆ドロップ対応カード描画コンポーネント（PCマウス / スマホタッチ対応）。
6. **`src/components/InGameScene.tsx`**: ライフ、リザーブ、フィールド、手札ドロワー等の各ゾーン描画とツールバー機能の統合。
7. **`src/components/DeckBuilderScene.tsx`**: Canvas画像圧縮機能とIndexedDB連携、JSONインポート/エクスポートUIの実装。

全ファイルがビルドエラーなく、型安全に動作する完全なコードを作成してください。
