# CLAUDE.md

## プロジェクト概要

Hello AI! サークルの運営メンバー向けタスク管理アプリ。
管理者がタスクを割り当て、全メンバーの担当状況と進捗を1画面で確認できる。
2名チーム・実装4時間20分のハッカソン成果物。**時間制約が最優先の判断基準**。

### 解決する課題

「誰が何を担当しているか分からない」ためにSlack上で確認が繰り返され、抜け漏れとタスクの重複が起きている。
担当と進捗を一箇所に集約し、確認のための会話そのものを不要にする。

## 技術スタック

- フロントエンド: Next.js (App Router) / TypeScript / Tailwind CSS
- DB・認証: Supabase (PostgreSQL, Auth, RLS)
- インフラ: Cloudflare Workers / Pages

## スコープ管理（最重要）

### Must（これ以外は実装しない）
1. ログイン＋ロール判定（admin / member）
2. 管理者によるタスク作成・担当者割り当て
3. 担当者別ボード表示＋進捗ステータス更新

### 明示的にやらないこと
- 3つ目以降のロール（閲覧専用、編集者など）を追加すること
- Slack通知、メール通知、リアルタイム同期
- ファイル添付、タグ・カテゴリ管理、工数集計、ガントチャート
- 自前の認証実装（Supabase Authを使う）
- 凝ったアニメーション、ダークモード切替

**新機能を提案する前に、上記Mustが完成しているか確認すること。**
未完成なら機能追加ではなく完成を優先する。

## データモデル

テーブルは2つのみ。増やす提案をしないこと。

### profiles
`id (auth.users参照), display_name, role, created_at`
- `role`: `admin` | `member`（default `member`）
- サインアップ時にトリガーで自動作成する

### tasks
`id, title, description, assignee_id, created_by, due_at, status, created_at, updated_at`
- `status`: `todo` | `in_progress` | `done`（default `todo`）
- `assignee_id` は null 許容（未割当タスク）

## 権限設計（最重要・事故が起きやすい箇所）

| 対象 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| tasks | 全員が全件 | adminのみ | adminまたは担当者本人 | adminのみ |
| profiles | 全員が全件 | トリガー経由 | 本人の表示名／adminのrole変更 | なし |

### 必ず守ること

1. **RLSポリシー内で `profiles` を直接SELECTしてロール判定をしない。**
   無限再帰（`infinite recursion detected in policy`）が発生する。
   ロール判定は `SECURITY DEFINER` の `public.is_admin()` 関数を経由する。

2. **権限チェックはUIだけで行わない。** RLSとAPI Route Handlerの両方で行う。
   ボタンを非表示にするだけの実装は不可。

3. **トークンやサービスロールキーをクライアント側に露出させない。**
   `SUPABASE_SERVICE_ROLE_KEY` は絶対にクライアントコンポーネントで使わない。

## コーディング規約

- 型定義は `types/task.ts` に集約する。**このファイルの変更は必ずチーム全員に共有する**
- APIのレスポンス形式は `{ data, error }` で統一
- 環境変数は `.env.local`。**絶対にコミットしない**（`.gitignore` を最初に確認）
- コンポーネントは `app/` 配下、共通UIは `components/`

## Git運用

- ブランチ: `main` / `feature/*`
- **mainへの直接pushは禁止。必ずPull Request経由**
- コミットは1機能・1修正で分割する
- PRはメンバー1名以上の承認が必要

## Claude Codeへの依頼方法

- 実装前に Plan Mode で計画を出し、チームの確認を得てから着手する
- 2回失敗したら `/clear` して、より具体的な指示で仕切り直す
- 不明点は推測で実装せず、質問すること

### 自己検証ループ（必須）

実装後は「動くはず」で終わらせず、必ず検証まで行う。

- `npm run build` が通ることを確認する
- Claude in Chrome 連携を使い、ローカルまたはデプロイ先の画面で以下を通しで実行して確認する
  1. adminでログイン → タスク作成 → 担当者を割り当て
  2. memberでログイン → 自分のタスクが表示される → ステータスを変更できる
  3. memberが他人のタスクを変更**できない**ことを確認する
- ブラウザのコンソールエラーとネットワークリクエストを読み、エラーがないことを確認する
- 権限まわりの修正時は、必ず「できるべき操作」と「できてはいけない操作」の両方を検証する

## 詰まったときの判断基準

- Cloudflareへのデプロイで30分以上詰まったら、Vite + React + Hono on Workers への切り替えを検討する
- RLSで1時間以上詰まったら、一旦RLSを無効化してAPI側の権限チェックのみで動かし、Must完成を優先する（発表では正直に「時間内はAPI層で担保、RLSは今後」と説明する）
