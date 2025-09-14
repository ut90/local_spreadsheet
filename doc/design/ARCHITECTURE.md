# アーキテクチャ設計

## ゴール/制約
- ゴール: ローカルYAMLの安全な編集を高速・直感的に実現
- 制約: オフライン・ローカルのみ、UIはスプレッドシート的、型保持、差分確認、Undo/Redo

## 全体アーキテクチャ
### プロセス分離
- Electron Main: ファイルI/O、バックアップ、アプリライフサイクル、セキュアIPC
- Renderer: UI（グリッド中心）、状態管理、編集操作、差分表示
- Parser/Diff Worker: YAMLパース/シリアライズ、投影（YAML→グリッド）、差分作成を非同期化

### 方式
- Mainは最小限・権限集中、Rendererは`nodeIntegration: false`、`contextIsolation: true`、`preload`で必要APIのみ露出
- YAMLはASTとして保持しつつ、UI用に「表形式の投影モデル」を別途生成
- 編集は「操作（Operation）」としてASTに適用し、その結果から保存用テキストと差分を生成

## 主要モジュール
- FileGateway（Main）
  - `openDialog()`, `readFile(path)`, `writeFile(path, content)`, `createBackup(path, content)`
  - 失敗時の例外設計とテンポラリファイルの扱い
- IPC Bridge（Preload）
  - ホワイトリストAPIのみ公開: `file.open()`, `file.save()`, `app.getVersion()`
- YAML Engine（Worker）
  - `parse(text) -> AST`（eemeli/yaml 想定）
  - `project(AST) -> GridModel`（投影: 行/列化）
  - `applyOps(AST, ops) -> AST'`（編集操作の適用）
  - `stringify(AST) -> text`（保存用YAML）
  - `diffText(before, after) -> hunks`（表示用diff）
- Grid Modeler（Renderer）
  - 列定義の生成、セル編集→操作生成、フィルタ/検索
  - 大規模配列を想定したVirtualized表示
- Undo/Redo Manager（Renderer）
  - 操作（op）スタック管理、逆操作の生成、状態の再投影
- Validation/Errors（Renderer+Worker）
  - パースエラー、型エラー、保存失敗の通知・復元支援
- Preferences（Main）
  - `app.getPath('userData')`で設定保存（最近使ったファイル、ビュー設定など）

## データモデル（要旨）
- YAML AST: ライブラリのCST/ASTノードを保持（順序やアンカーの将来拡張に備える）
- GridModel
  - `rows: Row[]`, `columns: Column[]`
  - 行: 配列要素または単一オブジェクトを表現
  - 列: キー（dot-path）の統合集合（例: `id`, `name`, `meta.created_at`）
  - セル: 型情報とASTノード参照/パスを付与し、逆変換を安定化
- Operation（編集操作）
  - `SetCell(rowId, colKey, newValue, typeHint)`
  - `AddRow(afterRowId?)`, `DeleteRow(rowId)`, `ReorderRow(rowId, toIndex)`
  - `RenameKey(colKey, newKey)`（将来）
  - 各操作はAST上の差分（patch）に落とせることを保証

## 投影ルール（YAML→表）
- ルートが配列: 各要素が行、オブジェクトは列に展開、スカラは`value`列
- ルートがオブジェクト: 1行表示＋各キーを列（簡易1行グリッド）
- ネスト: `a.b.c`のdot-pathで列化
- 欠損キー: 空セル、列集合は全行のキーの和集合（可視列はトグル可）
- 型: `bool|int|float|null|string|date?`の推定を保持（曖昧な文字列化を回避）

## 編集フロー
- セル編集: Rendererで`SetCell`生成 → Workerで`applyOps`→ AST更新 → 再投影 → dirtyフラグ
- 行操作: 追加/削除/並べ替えをOperation化（配列操作）→ AST更新 → 再投影
- 検索/フィルタ: GridModel上で実施（ASTには影響させない）

## ファイルフロー
- Open: Renderer→Main `file.open()`→ ダイアログ→読み込み → Renderer受領 → Workerで`parse`→`project`→表示
- Save: Renderer→Worker `stringify`→ `diff`生成 → Rendererで確認 → Mainへ`file.save(path, content)` → バックアップ→書込→通知
- Autosave/復元（将来）: dirty時ドラフト保存（`userData`配下）→異常終了時に復元提案

## IPC契約（抜粋）
- Renderer→Main
  - `file:openRequest` -> `{ filters }`
  - `file:saveRequest` -> `{ path, content }`
- Main→Renderer
  - `file:opened` -> `{ path, content }`
  - `file:saved` -> `{ path }`, `file:saveFailed` -> `{ error }`
- Renderer↔Worker
  - `yaml:parse` -> `{ text }` → `{ astId }`
  - `yaml:project` -> `{ astId }` → `{ grid }`
  - `yaml:applyOps` -> `{ astId, ops }` → `{ astId', grid }`
  - `yaml:stringify` -> `{ astId }` → `{ text }`
  - `yaml:diff` -> `{ before, after }` → `{ hunks }`

## Undo/Redo設計
- 操作志向: すべての編集はOperationで記録（逆操作を同時生成）
- 適用順序: Rendererがスタック管理、WorkerがASTに対して純粋関数的に適用
- パフォーマンス: 連続セル編集はバッチ化（合成）

## 差分表示
- 基本: テキストdiff（行単位、ハイライト）
- 将来: 構造diff（ASTノード単位）も併記できるよう拡張

## エラーハンドリング/リカバリ
- パースエラー: 行・列・近傍テキストをUIで提示、原文保持
- 保存失敗: 一時保存にフォールバック、ユーザー通知と再試行
- バックアップ: `filename.yyyymmdd-hhmm.bak`を同階層または`userData/backups/`に生成

## 性能/スケーラビリティ
- 重処理（パース/投影/差分）はWorkerへオフロード
- 大規模配列は仮想スクロール必須（限定DOM）
- 列集合が増える場合は「表示列のプリセット/トグル」を導入
- 目安: 1MB級YAMLで開く<1s、操作応答<100ms

## セキュリティ
- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
- Preloadで限定APIを`contextBridge`公開、IPCは入力/出力スキーマ検証
- CSP厳格化、`remote`無効、`eval`未使用、ネットワークアクセスなし

## 技術選定（候補）
- パーサ: `yaml`（eemeli/yaml）
- Diff: `diff`（text diff）、将来`jsondiffpatch`等の構造diff
- グリッド: `glide-data-grid`（高速・MIT）または`react-window`+カスタム
- UI: React + TypeScript + Vite（Renderer）
- 型/検証: TypeScript、ZodでIPCペイロードのバリデーション

## ディレクトリ構成（案）
- `src/main/`（エントリ、`FileGateway`, `BackupManager`, `ipc/mainHandlers`）
- `src/preload/`（IPC橋渡し、API公開）
- `src/renderer/`（`App`, `Grid`, `DiffPanel`, `stores`, `views`）
- `src/workers/`（`yamlEngine.ts`）
- `src/common/`（型定義、Operation/DTO、エラーモデル）
- `resources/`（アイコン等）
- `tests/`（ユニット/IPC契約）

## マイルストーン別設計到達点
- M1: ファイル開く→パース→投影→編集→Undo/Redo→文字列化→差分→保存
- M2: バックアップ/復元、フィルタ、配列ドラッグ、設定
- M3: コメント/アンカー保持、スキーマ検証、仮想スクロール最適化

## オープンクエスチョン（設計観点）
- ルートが複雑（混在型）のYAMLへの表示ポリシー（1行モード/強制ルート配列化）
- 列の自動推論と固定列（`id`推定など）の扱い
- コメント保持の優先度（ライブラリ機能に依存する落としどころ）
- 既定のバックアップ保存先（原ファイル同階層 vs `userData`）

## 次のステップ提案
- IPC契約の詳細仕様書（イベント名/ペイロード型/エラーコード）
- 投影ルールの詳細仕様（型表、境界ケース、逆変換ルール）
- 画面インタラクション仕様（ショートカット、フォーカス遷移、ダイアログ挙動）

