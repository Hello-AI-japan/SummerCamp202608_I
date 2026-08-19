-- HelloBoard マイグレーション: 担当者の複数化 (assignee_id → assignee_ids)
-- Supabaseダッシュボード > SQL Editor に貼り付けて実行してください。
-- 前提: 0001_init.sql が実行済みであること。

-- 1. 配列列を追加
alter table public.tasks add column assignee_ids uuid[] not null default '{}';

-- 2. 既存データを移行
update public.tasks
set assignee_ids = case when assignee_id is null then '{}'::uuid[] else array[assignee_id] end;

-- 3. assignee_id を参照しているポリシーを assignee_ids 用に張り替え
drop policy "tasks_update_admin_or_assignee" on public.tasks;

create policy "tasks_update_admin_or_assignee"
on public.tasks for update
to authenticated
using (public.is_admin() or auth.uid() = any(assignee_ids))
with check (public.is_admin() or auth.uid() = any(assignee_ids));

-- 4. 配列の絞り込み検索用インデックス
create index tasks_assignee_ids_idx on public.tasks using gin (assignee_ids);

-- 5. 旧インデックス・旧列を削除（FK制約も列と一緒に削除される）
drop index if exists tasks_assignee_id_idx;
alter table public.tasks drop column assignee_id;
