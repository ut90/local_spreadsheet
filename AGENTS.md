# Repository Guidelines

## Project Structure & Module Organization
- `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DETAILED_DESIGN.md`: Docs
- `samples/`: `communication_requirements.sample.yaml`, `*.schema.json`
- `src/main/`: Electron Main (file I/O, backups, IPC handlers)
- `src/preload/`: Secure IPC bridge via `contextBridge`
- `src/renderer/`: UI (React), grid, panels, state
- `src/workers/`: YAML parsing/projection/diff workers
- `src/common/`: Shared types, Operation model, DTOs
- `tests/`: Unit/IPC contract tests
- `resources/`: Icons and packaging assets

## Build, Test, and Development Commands
- `npm i` – Install dependencies
- `npm run dev` – Start renderer + Electron in dev mode
- `npm run build` – Production build (renderer + Electron)
- `npm test` – Run unit tests (Vitest)
- `npm run test:coverage` – Output coverage report

## Coding Style & Naming Conventions
- Language: TypeScript. Indent: 2 spaces. UTF-8.
- Lint/Format: ESLint + Prettier. Run `npm run lint` / `npm run format`.
- Naming: `PascalCase` React components, `camelCase` vars/functions, `kebab-case` files (`MyComponent.tsx` may be PascalCase).
- Modules: Prefer named exports; default export only for a single React component per file.
- Avoid side effects in modules; keep workers pure where possible.

## Testing Guidelines
- Framework: Vitest (+ React Testing Library for UI).
- File patterns: `*.test.ts` / `*.test.tsx` colocated with source or under `tests/`.
- Cover: operations undo/redo, YAML round-trip (`stringify→parse→project`), IPC payload validation.
- Run: `npm test` locally and ensure green before PR.

## Samples & Schema Validation (Node.js)
- Data: `samples/communication_requirements.sample.yaml`
- Schema: `samples/communication_requirements.schema.json`
- Install: `npm i -D ajv ajv-formats yaml`
- Validate (one-liner):
  - `node --input-type=module -e "import fs from 'fs';import YAML from 'yaml';import Ajv from 'ajv';import addFormats from 'ajv-formats';const s=JSON.parse(fs.readFileSync('samples/communication_requirements.schema.json','utf8'));const d=YAML.parse(fs.readFileSync(process.argv[1],'utf8'));const ajv=new Ajv({allErrors:true,strict:false});addFormats(ajv);const v=ajv.compile(s);if(v(d)){console.log('OK');process.exit(0);}console.error(v.errors);process.exit(1);" samples/communication_requirements.sample.yaml`

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Scope example: `feat(renderer): add diff panel toggle`.
- PRs: clear description, rationale, screenshots for UI changes, link issues (`Closes #123`), update docs if behavior changes.

## Security & Configuration Tips
- No network calls; local-only. File access via Main process only.
- Keep `nodeIntegration: false`, `contextIsolation: true`. Expose minimal preload APIs.
- Backups under Electron `userData`; avoid writing outside user-controlled paths.

## Architecture Notes for Contributors/Agents
- All edits flow through Operations; keep workers deterministic.
- Consult `ARCHITECTURE.md` and `DETAILED_DESIGN.md` before changes.

## Issue Management (Filesystem-based)
- Location: track issues as Markdown under `issue/`; closed items move to `issue/close/`.
- File naming: `issue-XXXX.md` (4-digit sequence) or `issue-YYYYMMDD-<slug>.md`. Keep unique and stable.
- Minimal fields:
  - Title, Status(open/close), Created/Updated, Owner, Labels, Summary, Repro/Expected/Actual, Links.
- Close flow:
  - Update `Status: close` with resolution note, then `mv issue/issue-XXXX.md issue/close/`.
- Summary:
  - Maintain `issue/README.md` with an Open Issues table (filename, title, owner, labels, updated) and a Closed tally.
