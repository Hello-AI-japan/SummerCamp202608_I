-- HelloBoard マイグレーション: タスクの開始日(start_at)を追加
-- Supabaseダッシュボード > SQL Editor に貼り付けて実行してください。
-- 前提: 0001〜0003 が実行済みであること。

alter table public.tasks add column if not exists start_at timestamptz;
