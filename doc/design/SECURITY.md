# Security

## Principles
- Least privilege: Renderer without Node; Main handles I/O.
- Validate all boundaries: preload and worker inputs/outputs.
- No network telemetry; local‑only processing by default.

## Electron Hardening
- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
- Disable `remote` module; forbid `eval`/`Function` usage
- Strict CSP; load local resources only

## Preload Surface
- Expose only: `file.open()`, `file.save()`, `app.getVersion()`
- Validate params with Zod; reject unknown fields
- Never pass raw file system paths from Renderer without checks

## File System Safety
- Prevent path traversal; normalize/resolve before use
- Atomic writes + backups; handle permissions and conflicts
- Avoid writing outside user-controlled paths (`userData`, chosen files)

## Dependencies
- Use pinned versions; scan with `npm audit` in CI
- Review high‑risk native modules; prefer pure JS

## Threat Model (non-goals)
- No multi-tenant or remote execution; assumes trusted local user
- Network access is not used by the app core

