# UX Specification

## Diff Review
- Before save, show inline or side‑by‑side text diff of YAML.
- Allow expand/collapse of hunks; copy patch; confirm/cancel actions.

## Grid Interaction
- Editing: Enter to edit, Esc to cancel, Tab/Shift+Tab to move.
- Multi‑select: Shift+click (range). Copy/paste preserves types when possible.
- Row ops: Add/Delete/Duplicate via toolbar or shortcuts.

## Search & Filter
- Global search (values/keys). Column filter chips for simple predicates.
- Large datasets: debounce input and show count of matches.

## Validation Display
- Inline badges (warn/error) on cells; tooltip with message.
- Side panel lists issues; clicking focuses the cell.

## Keyboard Shortcuts (MVP)
- Save: Ctrl/Cmd+S
- Undo/Redo: Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z
- Find: Ctrl/Cmd+F
- Add Row: Ctrl/Cmd+Enter; Delete Row: Ctrl/Cmd+Backspace

## Accessibility
- Full keyboard navigation; visible focus ring.
- Screen reader labels for grid headers and cells; ARIA roles applied.
- Zoom and font size adjustable from menu.

