alter table public.users
  add column if not exists is_school_admin boolean not null default false,
  add column if not exists managed_school_ids text[] not null default '{}';

