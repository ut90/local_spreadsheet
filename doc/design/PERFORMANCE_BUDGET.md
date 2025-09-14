# Performance Budget

## Targets (MVP)
- Open 1MB YAML: < 1s (p95)
- Initial projection render: < 300ms
- Edit latency (cell commit to paint): < 100ms
- Diff generation (1MB): < 300ms
- Memory footprint (idle): < 250MB total

## Strategies
- Offload parse/projection/diff to Worker
- Virtualize rows/columns in grid
- Batch operations for Undo/Redo; coalesce rapid edits (500ms window)
- Lazy compute column set; cache per document
- Debounce search/filter; index hot columns on demand

## Measurement Plan
- Synthetic fixtures: small (50KB), medium (300KB), large (1MB)
- Bench harness in CI to track timings and regressions
- Flamegraphs for slow paths; track GC pauses

## Thresholds & Alerts
- If p95 exceeds target by >20% across two runs, mark as regression
- PRs touching worker/grid must include perf check on 300KB fixture

