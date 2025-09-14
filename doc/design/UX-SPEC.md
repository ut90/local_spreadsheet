# UX Specification

## Diff Review
- Before save, show inline or side‑by‑side text diff of YAML.
- Allow expand/collapse of hunks; copy patch; confirm/cancel actions.

## Grid Interaction
- Editing: Enter to edit, Esc to cancel, Tab/Shift+Tab to move.
- Multi‑select: Shift+click (range). Copy/paste preserves types when possible.
- Row ops: Add/Delete/Duplicate via toolbar or shortcuts.

## Grid Controls (MVP)
- Wrap cells: Toggle text wrapping for cell contents (default ON). When ON, long tokens (hostnames/IPs) break at any point to fit.
- Column widths: Adjust min/max column width in px; actual widths are derived from content measurement and clamped by these values.
- Font size: Adjust monospace font size in px; affects measurement and rendering.
- Horizontal scroll: Header/body horizontally scroll in sync; header compensates for body scrollbar width to avoid misalignment.

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
