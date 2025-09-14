# Error Catalog

## Taxonomy
- ParseError: YAML parse failures
- ValidationIssue: Schema or projection validation
- SaveError: File write/permission/conflict
- IOError: Read failures, missing file, encoding

## Details
### ParseError
- Message: concise cause and location
- Data: `line`, `column`, `excerpt`
- UX: Highlight location, show original text snippet, offer copy to clipboard

### ValidationIssue
- Path: dot-path to offending field
- Severity: info | warn | error
- UX: Inline badge in grid, panel lists all issues; clicking focuses cell

### SaveError
- Codes: `IO` (disk full/locked), `PERM` (permission), `CONFLICT` (modified since open)
- UX: Dialog with next actions (retry, Save As…, open backups)

### IOError
- Causes: file not found, unreadable encoding
- UX: Message with path and suggested fix; allow choose another file

## Logging
- Local only. Levels: error | warn | info | debug
- Rotate logs; include error code, stack, and minimal context (no secrets)

