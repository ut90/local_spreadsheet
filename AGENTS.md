# Repository Guidelines

## Project Structure & Module Organization
- `doc/` – Product/design docs (PRD, architecture, projection rules).
- `samples/` – Example YAML + JSON Schema.
- `src/main/` – Electron Main (window, file I/O, IPC, dev CSP).
- `src/preload/` – Secure IPC bridge (`contextBridge`).
- `src/renderer/` – React UI and grid.
  - `components/`, `lib/`, `worker/`
- `tests/` – Vitest unit/contract tests.

## Build, Test, and Development Commands
- `npm i` – Install deps.
- `npm run dev` – Vite + tsc watch for main/preload, then launch Electron.
- `npm run build` – Production build (renderer + main/preload).
- `npm test` – Run Vitest. `npm run typecheck` for renderer types.
Optional: `ELECTRON_OPEN_DEVTOOLS=1 npm run dev` to auto-open DevTools.

## Coding Style & Naming Conventions
- TypeScript, 2-space indent, UTF-8. React components in PascalCase, files kebab-case (components may be PascalCase). camelCase for vars/functions.
- Prefer named exports; one default export only when exporting a single React component.
- Keep modules side-effect free; workers must be deterministic.

## Testing Guidelines
- Framework: Vitest. Files: `*.test.ts(x)` (colocated or under `tests/`).
- Cover projection (`project()`), grid row/column merging, and IPC DTOs.
- Run locally with `npm test` before PRs.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` (scopes like `renderer`, `main`).
- PRs: clear description, rationale, linked issues (`Closes #123`), screenshots for UI changes, and doc updates when behavior changes.

## Security & Configuration Tips
- Electron hardening: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- CSP strict in production; dev injects CSP to support Vite HMR without enabling `unsafe-eval` in packaged builds.
- Renderer is local-only; file access goes through Main via IPC.

## Samples & Schema Validation
- Data: `samples/communication_requirements.sample.yaml`
- Schema: `samples/communication_requirements.schema.json`
- Install: `npm i -D ajv ajv-formats yaml`
- Validate (one‑liner):
  ```bash
  node --input-type=module -e "import fs from 'fs';import YAML from 'yaml';import Ajv from 'ajv';import addFormats from 'ajv-formats';const s=JSON.parse(fs.readFileSync('samples/communication_requirements.schema.json','utf8'));const d=YAML.parse(fs.readFileSync(process.argv[1],'utf8'));const ajv=new Ajv({allErrors:true,strict:false});addFormats(ajv);const v=ajv.compile(s);if(v(d)){console.log('OK');process.exit(0);}console.error(v.errors);process.exit(1);" samples/communication_requirements.sample.yaml
  ```
