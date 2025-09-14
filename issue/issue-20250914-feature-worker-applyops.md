## Title: WorkerにapplyOps（astPath対応）を実装

Status: open
Created: 2025-09-14
Updated: 2025-09-14
Owner: TBD
Labels: feature, worker, operations

## Summary
- 各セルに astPath を付与し、Rendererは編集→Op生成→Worker.applyOpsでASTへ反映。
- Rendererはステートレス化（AST更新はWorkerの結果で受け取る）。

## Tasks
- [ ] project()で各セルにastPathを付与
- [ ] Op定義の拡充（SetCell/AddRow/DeleteRow/ReorderRow）
- [ ] applyOps: astPathを使った堅牢な更新
- [ ] Renderer: onEditでOpを送り、返却gridで再描画
- [ ] エラーハンドリング（不正path、型不一致）

## Related Links
- src/renderer/worker/yamlEngine.ts
- doc/design/PROJECTION_RULES.md

