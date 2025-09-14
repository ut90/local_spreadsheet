## Title: 階層配列の行操作（追加/削除/並べ替え）

Status: open
Created: 2025-09-14
Updated: 2025-09-14
Owner: TBD
Labels: feature, grid, arrays

## Summary
- 自/他システムサーバー等の配列について、サブ行の追加/削除/並べ替えに対応し、編集をASTへ反映。

## Tasks
- [ ] UI: サブ行末に +/−/↑/↓ の操作ボタン
- [ ] Op: addSubRow/deleteSubRow/reorderSubRow（親行+グループ名+index）
- [ ] Worker: applyOpsで配列操作
- [ ] 初期値ルール（名称/ホスト/IPの雛形）
- [ ] テスト（複数要素/空配列）

## Related Links
- doc/design/GRID_HEADER_SPEC.md

