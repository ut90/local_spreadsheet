# Settings

## Location
- Electron `app.getPath('userData')/settings.json`

## Schema (MVP)
- `autosaveIntervalMs` (number, default 60000)
- `backups.keep` (number, default 5)
- `ui.zoom` (number, default 1.0)
- `grid.hiddenColumns` (string[])
- `recentFiles` (string[], MRU)

## Defaults
- Stored on first run; migrations applied by `version` field.

## Example
```json
{
  "version": 1,
  "autosaveIntervalMs": 60000,
  "backups": { "keep": 5 },
  "ui": { "zoom": 1 },
  "grid": { "hiddenColumns": ["meta.notes"] },
  "recentFiles": ["/path/to/file.yaml"]
}
```

## Migration
- Add `version` to settings; on bump, transform keys and write back atomically.

