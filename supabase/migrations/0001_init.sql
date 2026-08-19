-- HelloBoard 初期スキーマ
-- Supabaseダッシュボード > SQL Editor に貼り付けて実行してください。

-- 1. profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now()
);

-- 2. tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_status_idx on public.tasks (status);

-- 3. updated_at 自動更新
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- 4. サインアップ時に profiles を自動作成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'member'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 5. ロール判定（RLSポリシー内で profiles を直接SELECTすると無限再帰するため、
--    SECURITY DEFINER 関数経由にする）
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 6. adminでない限り自分の role を書き換えられないようにする
--    （RLSは行単位の制御のみのため、列単位の制御はここで担保する）
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'only admin can change role';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute function public.prevent_role_escalation();

-- 7. RLS有効化
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;

-- 8. profiles ポリシー
create policy "profiles_select_all"
on public.profiles for select
to authenticated
using (true);

create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());
-- INSERTポリシーなし: 直接INSERTは全員拒否（handle_new_userトリガーはテーブル所有者権限で実行されRLSをバイパスする）
-- DELETEポリシーなし: 誰も削除できない

-- 9. tasks ポリシー
create policy "tasks_select_all"
on public.tasks for select
to authenticated
using (true);

create policy "tasks_insert_logged_in"
on public.tasks for insert
to authenticated
with check (created_by = auth.uid());

create policy "tasks_update_admin_or_assignee"
on public.tasks for update
to authenticated
using (public.is_admin() or assignee_id = auth.uid())
with check (public.is_admin() or assignee_id = auth.uid());

create policy "tasks_delete_admin_only"
on public.tasks for delete
to authenticated
using (public.is_admin());
