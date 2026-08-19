-- M5: ガントチャートと見積工数
alter table public.tasks
  add column start_at timestamptz,
  add column estimated_hours numeric(8, 2) check (estimated_hours is null or estimated_hours >= 0);