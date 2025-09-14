# Backup and Recovery

## Goals
- Prevent data loss on save. Provide recovery after crashes or I/O failures.

## Atomic Write Strategy
- On save:
  1) Create temp file in same directory: `<name>.tmp-<pid>-<ts>`
  2) Write new content → `fsync` file → close
  3) Optional: create timestamped backup `name.yyyymmdd-hhmm.bak`
  4) Replace original via atomic rename
- Failure handling: if step (4) fails, keep temp and surface `SaveError:CONFLICT`.

## Backups
- Default: keep last N=5 backups alongside original or under `userData/backups/` with relative path preserved.
- Naming: `filename.yyyymmdd-hhmm.bak` (local time).
- Cleanup: rolling deletion beyond N.

## Autosave Drafts
- When dirty, write drafts to `userData/drafts/<docId>.yaml` every 60s (configurable).
- On reopen after crash, prompt: restore from latest draft vs open original.

## File Locking
- Advisory lock during save to prevent concurrent writes from this app instance.
- Detect external modification (mtime/hash). If changed since open: prompt merge/overwrite.

## Encoding & EOL
- Read as UTF‑8 (BOM tolerated). Preserve existing EOL (`\n`/`\r\n`) on write.
- New files default to UTF‑8, `\n`.

## User Flows
- Save success: show brief toast with path.
- Save failure: show actionable dialog (retry, save as…, open backup location).
- Recovery: list available drafts/backups with timestamps and size.

