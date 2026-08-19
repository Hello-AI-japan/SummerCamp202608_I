# CLAUDE.md

## プロジェクト概要

Gmail・Slack・Googleカレンダーに分散したタスクを1画面に統合表示するダッシュボード。
2名チーム・実装4時間20分のハッカソン成果物。**時間制約が最優先の判断基準**。

### 解決する課題

複数ツールを使う人が「今日やること」を把握するために複数アプリを巡回する無駄をなくす。
すべてのタスクを共通スキーマに正規化し、期限順に1画面で表示する。

## 技術スタック

- フロントエンド: Next.js (App Router) / TypeScript / Tailwind CSS
- DB・認証: Supabase (PostgreSQL, Auth, RLS)
- インフラ: Cloudflare Workers / Pages
- 外部API: Google Calendar API（Gmailは余力があれば）

## アーキテクチャの原則

**表示層は `tasks` テーブルのみを参照する。外部APIを直接叩かない。**
外部サービスは「同期API経由で tasks に正規化して書き込む」役割に限定する。
これによりソースが増減しても表示層を変更しなくてよく、連携が失敗してもアプリは動作する。

```
Googleカレンダー ─┐
Gmail            ─┼─→ /api/sync/* ─→ tasks テーブル ─→ ダッシュボードUI
手動入力         ─┘
```

## スコープ管理（最重要）

### Must（これ以外は実装しない）
1. タスク統合ビュー（期限切れ/今日/今週/期限なしの4区分表示）
2. Googleカレンダー連携（取得→正規化→upsert）
3. タスクの手動追加・完了状態の更新

### 明示的にやらないこと
- Slack連携、リアルタイム同期、Webhook
- 通知機能、チーム共有、AI要約
- 凝ったアニメーション、ダークモード切替
- 自前の認証実装（Supabase Authを使う）

**新機能を提案する前に、上記Mustが完成しているか確認すること。**
未完成なら機能追加ではなく完成を優先する。

## データモデル

### tasks
`id, user_id, source, external_id, title, url, due_at, status, priority, raw, synced_at, created_at`

- `source`: `google_calendar` | `gmail` | `manual`
- `status`: `todo` | `done` | `ignored`
- **`UNIQUE (user_id, source, external_id)` 制約が必須**。同期は必ず upsert で行い、重複を作らない
- RLS: `auth.uid() = user_id`

### connections
`id, user_id, provider, access_token, refresh_token, expires_at, created_at`

トークンは平文でログ出力しないこと。

## コーディング規約

- TypeScriptの型は `types/task.ts` に集約する。**このファイルの変更は必ずチーム全員に共有する**
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
- 実装後は必ず検証手段（`npm run build` の成功、動作確認手順）まで提示する
- 不明点は推測で実装せず、質問すること

## 詰まったときの判断基準

- Cloudflareへのデプロイで30分以上詰まったら、Vite + React + Hono on Workers への切り替えを検討する
- OAuth連携が実装②の終了時点（3:35）で動かない場合、手動入力のみでデモを成立させる方向に切り替える
