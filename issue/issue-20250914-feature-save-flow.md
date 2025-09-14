## Title: 保存フロー（stringify/検証/diff/バックアップ/保存）

Status: open
Created: 2025-09-14
Updated: 2025-09-14
Owner: TBD
Labels: feature, save, validation, diff, backup

## Summary
- 編集内容を安全に保存するフローを実装する。
- 手順: AST→stringify→schema検証→diffプレビュー→バックアップ→書込→通知。

## Tasks
- [ ] Worker: stringify APIの利用点を整理（既存）
- [ ] Worker: ajvでschema検証（samplesごとに切替）
- [ ] Renderer: 保存アクション（Save/Save As）とUI
- [ ] Diffプレビューの表示・確認ダイアログ
- [ ] Main: バックアップ作成（userData/または同階層）と書込、エラーハンドリング
- [ ] IPC契約のエラー設計（検証/書込失敗）

## Related Links
- doc/design/GRID_HEADER_SPEC.md
- doc/design/PROJECTION_RULES.md

