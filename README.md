# ローカルスプレッドシート編集

YAMLを「スプレッドシート的な表形式」で安全かつ直感的に編集するローカル（オフライン）アプリ。Electron実装を前提に設計しています。

## 進捗状況（概要）
- 完了
  - グリッド表示（2段ヘッダー＋rowspan）、横スクロール同期、動的列幅、折り返し（既定ON）
  - サブ行展開（自/他システムサーバー等）と行マージ、基本セル編集（単層・階層子セル）
  - Open YAML（ファイル選択）、CSP強化（dev/prod）
- 進行中 / 次対応
  - 保存フロー（stringify→schema検証→diff→バックアップ→保存）
  - Worker.applyOps＋astPath付与、Undo/Redo（SetCell優先）
  - 階層配列の行操作（追加/削除/並べ替え）、型/入力/検証、キーボード操作/フォーカス、設定永続化、テスト強化
- トラッキング: `issue/` の feature-* を参照（README内リンク）

## 特長（MVP）
- ローカルYAMLの読み込み・編集・保存（差分プレビュー、Undo/Redo）
- 配列/オブジェクトの表形式投影、型保持と安全な直列化
- エラー可視化（パース/検証/保存）とバックアップ・復元

## プロジェクト構成
- `doc/`: 仕様・設計・運用ドキュメント（下記リンク参照）
- `samples/`: サンプルデータと検証スキーマ
  - `communication_requirements.sample.yaml`
  - `communication_requirements.schema.json`
- `src/`: アプリ本体
  - `main/`: Electron Main（エントリは `dist/main/main.js`）
  - `preload/`: Preload（`contextBridge` でAPI公開）
  - `renderer/`: React + Vite（UI, 依存レスな軽量グリッド実装を内蔵）

## サンプルとバリデーション（Node.js）
- 依存導入: `npm i -D ajv ajv-formats yaml`
- 検証ワンライナー:
  - `node --input-type=module -e "import fs from 'fs';import YAML from 'yaml';import Ajv from 'ajv';import addFormats from 'ajv-formats';const s=JSON.parse(fs.readFileSync('samples/communication_requirements.schema.json','utf8'));const d=YAML.parse(fs.readFileSync(process.argv[1],'utf8'));const ajv=new Ajv({allErrors:true,strict:false});addFormats(ajv);const v=ajv.compile(s);if(v(d)){console.log('OK');process.exit(0);}console.error(v.errors);process.exit(1);" samples/communication_requirements.sample.yaml`
- スキーマは必須/列挙/範囲/パターンを検証します。変更時は `samples/communication_requirements.schema.json` を更新してください。

## 主要ドキュメント
- 開発ガイド: `AGENTS.md`
- 製品要件: `doc/prd/PRD.md`
- アーキテクチャ: `doc/design/ARCHITECTURE.md`
- 詳細設計（データモデル/図）: `doc/design/DETAILED_DESIGN.md`
- 投影ルール: `doc/design/PROJECTION_RULES.md`
- IPC仕様: `doc/design/SPEC-IPC.md`
- バックアップ/復元: `doc/design/BACKUP_AND_RECOVERY.md`
- エラーカタログ: `doc/design/ERROR_CATALOG.md`
- UX仕様: `doc/design/UX-SPEC.md`
- グリッド見出し仕様（2段ヘッダー混在）: `doc/design/GRID_HEADER_SPEC.md`
- パフォーマンス目標: `doc/design/PERFORMANCE_BUDGET.md`
- セキュリティ: `doc/design/SECURITY.md`
- 設定仕様: `doc/design/SETTINGS.md`
- テスト戦略: `doc/design/TEST_STRATEGY.md`
- Issues: `issue/README.md`
- 実行（MVP開発用）
- 依存導入: `npm i`
- 開発起動: `npm run dev`（Vite + tscウォッチ + Electron。preload/main の初回ビルド完了を待って起動）
- 本番ビルド: `npm run build`
  - グリッド表示: サンプルYAMLを読み込み後、内蔵の軽量グリッドで表示（読み取り専用）

## 表示・操作メモ（MVP）
- 2段ヘッダー: サーバー群などはグループ（上段）＋項目（下段）で表示。単層カラムは縦結合（rowspan）。
- 行マージ: サーバー群が複数のとき、サブ行に展開し他カラムは縦結合。
- 横スクロール: ヘッダー/ボディが同期してスクロール。
- 表示調整: 画面上部で Wrap cells（既定ON）、Min/Max 列幅（px）、Font（px）を調整可能。

トラブルシューティング
- 「Open Sample YAML」で何も表示されない場合:
  - ターミナルに初回ビルド完了ログ（`dist/preload/index.js`, `dist/main/main.js`作成）が出た後にElectronが起動しているか
  - DevTools コンソールにエラーがないか（`window.api` 未定義 = preload未読込）
