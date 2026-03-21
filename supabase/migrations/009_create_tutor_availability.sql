create table if not exists public.tutor_availability_rules (
  id uuid primary key default gen_random_uuid(),
  tutor_user_id uuid not null references public.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'UTC',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_tutor_availability_rules_time_range check (end_time > start_time)
);

create unique index if not exists idx_tutor_availability_rules_unique
  on public.tutor_availability_rules (tutor_user_id, weekday, start_time, end_time);

create index if not exists idx_tutor_availability_rules_tutor
  on public.tutor_availability_rules (tutor_user_id, weekday);

create table if not exists public.tutor_availability_overrides (
  id uuid primary key default gen_random_uuid(),
  tutor_user_id uuid not null references public.users(id) on delete cascade,
  override_date date not null,
  is_available boolean not null default false,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_tutor_availability_overrides_time_range check (
    (is_available = false and start_time is null and end_time is null) or
    (is_available = true and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists idx_tutor_availability_overrides_tutor_date
  on public.tutor_availability_overrides (tutor_user_id, override_date);

