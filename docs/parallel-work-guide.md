# M4〜M7 並行開発ガイド

AさんとBさんが同時に作業してもコンフリクトしないよう、担当機能とファイル所有権を分けている。**下記の一覧にないファイルを触る場合は、着手前にもう一方に共有すること。**

## 前提（Claudeが実装済みの共通下準備）

以下はmainに入っている前提。A・Bはこの後の状態からブランチを切る。

- `supabase/migrations/0003_m4_m7_schema.sql`（`tasks.estimated_hours`列、`task_comments`テーブル＋RLS）
- `types/task.ts`（`estimated_hours`追加済み）、`types/comment.ts`（新規）
- `lib/notifications/notify.ts`（Slack通知のno-opスタブ。呼び出し箇所は配線済み）
- `app/api/tasks/route.ts` / `app/api/tasks/[id]/route.ts`（`estimated_hours`の受け渡し、`notifyTaskEvent`の呼び出しを追加済み）
- `.env.local.example`（`SLACK_WEBHOOK_URL`を追加済み）

Supabase側で`0003_m4_m7_schema.sql`をSQL Editorで実行してから作業を始めること。

## Aさんの担当（M4: Slack通知連携／M5: ガントチャート・工数集計）

所有ファイル（新規作成・編集とも、Aさんだけが触る）:

- `lib/notifications/notify.ts` — Slack Incoming Webhookへのfetch実装（`SLACK_WEBHOOK_URL`を使う）
- `app/gantt/page.tsx`（新規）
- `components/gantt/*.tsx`（新規）
- `components/board/CreateTaskModal.tsx` — 見積工数（`estimated_hours`）の入力欄を追加

## Bさんの担当（M6: 期限順ソート／M7: タスクコメント）

所有ファイル（新規作成・編集とも、Bさんだけが触る）:

- `components/board/Board.tsx` — 期限順ソートのトグルを追加（赤色ハイライトは実装済みのため対応不要）
- `components/board/TaskCard.tsx` — コメント欄の表示/開閉トリガーを追加
- `app/api/tasks/[id]/comments/route.ts`（新規、GET/POST）
- `app/api/comments/[commentId]/route.ts`（新規、DELETE）
- `components/board/CommentList.tsx`／`components/board/CommentForm.tsx`（新規）

## 触ってはいけない/事前共有が必要なもの

- `types/task.ts` / `types/comment.ts` — 下準備で既に必要なフィールドが揃っている想定。追加が必要になったら着手前にもう一方と共有する
- `supabase/migrations/*.sql` — 新しいマイグレーションが必要になった場合は採番（`0004_`〜）が衝突しないよう先に一声かける
- 既存の5本のAPI（`/api/tasks`, `/api/tasks/:id`, `/api/members`）— M4/M5/M6/M7のどの担当も変更不要なはず。変更が必要になったらまず設計を見直す

## マージ順

AさんとBさんのPRはファイルが重複しないため、どちらを先にマージしても衝突しない想定。両方マージ後に`npm run build` / `npm run lint`を通し、CLAUDE.mdの自己検証ループ（できるべき操作／できてはいけない操作の両方の確認）を実施する。
