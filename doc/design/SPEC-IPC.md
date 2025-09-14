# IPC Specification

## Process Boundaries
- Main: privileged (file I/O, backups). No direct DOM access.
- Renderer: UI. No Node integration. Uses preload‑exposed APIs only.
- Worker(s): YAML parse/project/stringify/diff. Communicate via `postMessage`.

## Transport
- Renderer ↔ Main: Electron IPC (`ipcRenderer`/`ipcMain`) via preload wrappers.
- Renderer ↔ Worker: `postMessage` with typed payloads.

## Channels (Renderer ↔ Main)
- `file:openRequest`
  - Req: `{ filters?: { name: string; extensions: string[] }[] }`
  - Res: `file:opened` `{ path: string; content: string } | file:openCanceled {}`
- `file:saveRequest`
  - Req: `{ path: string; content: string }`
  - Res: `file:saved { path: string } | file:saveFailed { error: SaveError }`
- `app:getVersion`
  - Res: `{ version: string }`

## Channels (Renderer ↔ Worker)
- `yaml:parse`
  - Req: `{ text: string }`
  - Res: `{ astId: string } | { error: ParseError }`
- `yaml:project`
  - Req: `{ astId: string }`
  - Res: `{ grid: GridModel }`
- `yaml:applyOps`
  - Req: `{ astId: string; ops: Operation[] }`
  - Res: `{ astId: string; grid: GridModel }`
- `yaml:stringify`
  - Req: `{ astId: string }`
  - Res: `{ text: string }`
- `yaml:diff`
  - Req: `{ before: string; after: string }`
  - Res: `{ hunks: DiffHunk[] }`

## Error Contract
- `ParseError`: `{ message: string; line?: number; column?: number; excerpt?: string }`
- `SaveError`: `{ code: 'IO'|'PERM'|'CONFLICT'; detail?: string }`
- Validation errors (schema): `{ path: string; message: string }[]`

## Security & Validation
- All IPC inputs/outputs validated with Zod in preload and worker boundaries.
- Preload exposes a minimal API: `file.open()`, `file.save()`, `app.getVersion()`.
- Reject unknown fields (`strip: false`) and sanitize strings used for paths.

