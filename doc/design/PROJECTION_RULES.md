# Projection Rules (YAML ↔ Grid)

## Scope
- Defines deterministic mapping between YAML documents and the grid UI, and reverse mapping for edits.
- Applies to read/preview/save flows and Undo/Redo operations.

## Root Shapes
- Sequence root: each item becomes a row. Objects expand to columns; scalars go to `value`.
- Mapping root: a single row; top-level keys become columns.
- Scalar root: a single row with a single `value` column.

## Column Keys (dot-path) と列順
- Nested fields flatten using dot-path: `a.b.c`.
- Array index uses brackets: `items[3].name` (internal `astPath`), but columns never include indexes; they represent keys (e.g., `items.name`).
- Column set = union of keys across all rows; hidden columns can be toggled.
- Column order follows the key order in the first data item (or the single object when not a sequence). Keys that appear later are appended in the order of first appearance. Within grouped two-level columns, child order follows first appearance as well.

## Missing/Empty/Null
- Missing key → empty cell (no AST node yet).
- Explicit null → renders as `null` (type `null`).
- Empty string remains empty string (type `string`).

## Mixed Types & Arrays
- If rows under the same column hold different scalar types, keep per-cell type.
- Arrays of objects under a logical group (e.g., `自システムサーバー`, `他システムサーバー`) are aggregated into two-level columns:
  - Column keys become `<group>.<field>` for the union of fields across elements.
  - Each cell shows values joined by `、` across the array elements.
  - Example: `他システムサーバー: [{ 名称, ホスト, IP }, ...]` → columns `他システムサーバー.名称`, `他システムサーバー.ホスト`, `他システムサーバー.IP`.
- Nested arrays of primitives or mixed types fall back to a single-level column `<key>` with joined display.

## Duplicate Keys (YAML edge case)
- Detect duplicates in a mapping and surface a validation error.
- Read: keep the first occurrence for projection; show a warning badge on the row.
- Write: edits apply to the first occurrence. A future “dedupe” action may normalize.

## Types & Quoting
- Inference: `bool|int|float|null|string|date?` with conservative promotion to `string` to avoid unintended coercion.
- `typeHint` set on edit; `stringify` respects it (e.g., preserve leading zeros by quoting strings).

## Reverse Mapping Guarantees
- Each cell binds to an `astPath`. Edits produce Operations (e.g., `SetCell`) that update the exact node or create it if missing.
- Row operations map to sequence insert/delete/reorder on the underlying array.

## Examples
YAML (sequence of objects):
```yaml
- id: 1
  name: Alice
- id: 2
  name: Bob
  meta:
    created_at: 2025-09-01
```
Grid columns: `id`, `name`, `meta.created_at`
