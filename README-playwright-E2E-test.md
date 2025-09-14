# playwrightでのE2E試験 devcontainer内


Electron の E2E は Playwright の `_electron` ドライバで動かせるので、ブラウザは不要。**devcontainer では X サーバが無い**ため、`xvfb`（仮想ディスプレイ）を入れて `xvfb-run` 経由でテストを回すのが安定です。

# 最小セットアップ手順（コピー用）

## 1) devcontainer/Dockerfile

（Ubuntu/Debian系ベース想定）

Dockerfile

コードをコピーする

`# ベースは任意の node イメージや devcontainer イメージでOK # 例: mcr.microsoft.com/devcontainers/typescript-node:22 FROM mcr.microsoft.com/devcontainers/typescript-node:22  # Electron/Playwright が要求するランタイム依存を追加 RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \     xvfb dbus-x11 \     libnss3 libatk1.0-0 libatk-bridge2.0-0 libdrm2 libgbm1 libasound2 \     libcups2 libxkbcommon0 libx11-xcb1 libxdamage1 libxcomposite1 libxrandr2 \     libxfixes3 libxext6 libxshmfence1 libgtk-3-0 libpango-1.0-0 libcairo2 \     && rm -rf /var/lib/apt/lists/*`

## 2) .devcontainer/devcontainer.json

json

コードをコピーする

`{   "name": "electron-e2e",   "build": { "dockerfile": "Dockerfile" },   "customizations": {     "vscode": {       "settings": { "terminal.integrated.shellIntegration.enabled": true },       "extensions": ["ms-playwright.playwright"]     }   },   "postCreateCommand": "corepack enable && pnpm -v || npm -v" }`

## 3) 依存関係

bash

コードをコピーする

`pnpm add -D @playwright/test # Electron はアプリ側で既に依存に入っている前提（なければ） pnpm add -D electron`

## 4) Playwright 設定

`playwright.config.ts`

ts

コードをコピーする

`import { defineConfig } from '@playwright/test'  export default defineConfig({   timeout: 60_000,   retries: process.env.CI ? 2 : 0,   use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },   reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]], })`

## 5) テスト例（Electron 起動）

`tests/electron.spec.ts`

ts

コードをコピーする

`import { test, expect, _electron as electron } from '@playwright/test' import path from 'node:path'  test('app boots and shows title', async () => {   // ビルド済みの main エントリに差し替えてください   const main = path.resolve(__dirname, '../dist/main/index.js')    // xvfb で付与される DISPLAY を使う（devcontainer内）   const app = await electron.launch({     args: [main],     env: { ...process.env } // DISPLAY を伝播   })    const win = await app.firstWindow()   await expect(win).toHaveTitle(/My App/i)    // preload で公開したAPIの呼び出し例（必要なら）   // await win.evaluate(() => window.api.ping())    await app.close() })`

## 6) スクリプト

`package.json`

json

コードをコピーする

`{   "scripts": {     "build": "vite build && tsc -p tsconfig.main.json", // 例     "test:e2e": "xvfb-run -a --server-args='-screen 0 1280x720x24' playwright test",     "test:e2e:headed": "playwright test"  // ローカルのXがある場合向け   } }`

> ポイント：**devcontainer内では `xvfb-run` を付ける**（DISPLAY が無いので）。  
> Electron 用の Playwright はブラウザをインストールしなくてもOKですが、**システムの X/GTK などのランタイムが必要**なので Dockerfile の `apt-get` 群が重要です。

---

# うまく動かないときのチェックリスト

- **DISPLAY が無い** → `echo $DISPLAY` が空なら `xvfb-run` で起動しているか確認。
    
- **GL/GBM エラー** → `libdrm2 libgbm1` が入っているか。コンテナを再ビルド。
    
- **GTK 関連のロード失敗** → `libgtk-3-0 libxkbcommon0` などが不足していないか。
    
- **dbus 警告**（無視可が多い）だが気になる場合は `dbus-x11` を入れる。
    
- **CI でクラッシュ** → `--disable-gpu` を Electron に渡すと安定することがある：
    
    ts
    
    コードをコピーする
    
    `const app = await electron.launch({ args: ['--disable-gpu', main] })`
    
- **ビルド物差異** → dev サーバではなく **本番ビルド（`vite build`）** を起動対象にする。
    

---

# 余談：Vitest との棲み分け

- Renderer/Main の **ユニットは Vitest**、アプリまるごとの **結合/E2E は Playwright（xvfb）**。
    
- 重要機能は E2E で 2〜5 本に絞ってクリティカルパスを担保、残りはユニットで厚く。
    

必要なら、あなたのリポ構成（main/preload/renderer のフォルダやビルドコマンド）に合わせた **動く最小リポの雛形**をこの場で吐きます。