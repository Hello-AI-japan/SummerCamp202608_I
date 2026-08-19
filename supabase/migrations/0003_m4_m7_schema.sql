-- HelloBoard マイグレーション: M4〜M7向けスキーマ追加
-- Supabaseダッシュボード > SQL Editor に貼り付けて実行してください。
-- 前提: 0001_init.sql, 0002_multi_assignee.sql が実行済みであること。

-- 1. M5: 工数集計用の見積工数列
alter table public.tasks add column estimated_hours numeric;

-- 2. M7: タスクコメント（独立テーブル）
-- コメントは「誰でも投稿できるが、削除は投稿者本人かadminのみ」という、
-- tasksの行単位ポリシー（admin/担当者のみ更新可）とは独立した権限が必要なため、
-- JSONB埋め込みではなく専用テーブルにする（CLAUDE.mdの「テーブルは2つのみ」の例外）。
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index task_comments_task_id_idx on public.task_comments (task_id);

alter table public.task_comments enable row level security;

create policy "task_comments_select_all"
on public.task_comments for select
to authenticated
using (true);

create policy "task_comments_insert_logged_in"
on public.task_comments for insert
to authenticated
with check (author_id = auth.uid());

create policy "task_comments_delete_author_or_admin"
on public.task_comments for delete
to authenticated
using (author_id = auth.uid() or public.is_admin());
-- UPDATEポリシーなし: コメントは編集不可（削除して投稿し直す運用にする）
