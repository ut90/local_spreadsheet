## Title: Undo/Redo（SetCell優先）

Status: open
Created: 2025-09-14
Updated: 2025-09-14
Owner: TBD
Labels: feature, undo, redo

## Summary
- 操作（Op）ベースのUndo/Redoを導入。まずはSetCellの取り消し/やり直しから。

## Tasks
- [ ] Operationスタック（undos/redos）と逆操作生成
- [ ] Rendererのショートカット割り当て（Ctrl/Cmd+Z / Shift+Z）
- [ ] applyOpsの結果でスタック更新
- [ ] テスト（連続編集、境界ケース）

## Related Links
- doc/design/DETAILED_DESIGN.md（Operation章）

