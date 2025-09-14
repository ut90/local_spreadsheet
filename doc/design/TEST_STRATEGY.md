# Test Strategy

## Levels
- Unit: operations, projection, stringify/parse round‑trip
- Integration: IPC (Renderer↔Main, Renderer↔Worker) with mocked FS
- UI: component tests for grid/diff panels (React Testing Library)

## Focus Areas
- Projection rules: YAML→Grid and reverse mapping invariants
- Undo/Redo: apply + inverse returns to original state
- Schema validation: sample YAML conforms; helpful errors on violations
- Save path: atomic write mocked; backup creation; conflict detection

## Tooling
- Vitest for unit/integration. jsdom for component tests.
- Property tests for round‑trip invariants (fast‑check optional).

## Conventions
- Test files: `*.test.ts(x)` colocated or under `tests/`
- Use fixtures under `tests/fixtures/` (small/medium/large YAML)

## CI Gates
- All tests green; coverage threshold for core (projection/ops) ≥ 80%
- Lint and typecheck must pass

