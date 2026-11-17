alter table public.users
  add column if not exists is_facilitator_certified boolean not null default false;
