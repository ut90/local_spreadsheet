## Title: 型/入力/検証の強化（数値/真偽/enum）

Status: open
Created: 2025-09-14
Updated: 2025-09-14
Owner: TBD
Labels: feature, validation, types

## Summary
- セル入力時の型扱い（数値/真偽/NULL）とenum（プロトコル/通信方向）の検証/補助。

## Progress
- DONE: Ajv 2020対応・schema検証の実行/スキップ基盤・Validate on saveトグル
- TODO: enum入力支援（ドロップダウン）、数値/真偽/NULLのパースルール
- TODO: 検証エラーのUI整備（セル強調・一覧）

## Tasks
- [ ] 型ヒント/推定に基づく値パース（例: 5671→int）
- [ ] enum入力支援（ドロップダウン）
- [ ] 入力時/保存時の検証とエラーメッセージ表示
- [ ] スキーマ（ajv）と整合するルールに統一

## Related Links
- samples/*.schema.json
