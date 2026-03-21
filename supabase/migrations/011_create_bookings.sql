create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  school_admin_user_id uuid not null references public.users(id) on delete cascade,
  tutor_user_id uuid not null references public.users(id) on delete cascade,
  school_id text not null,
  booking_type text not null check (booking_type in ('single_lesson', 'programme_block')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  requested_timezone text not null default 'UTC',
  notes text,
  programme_start_date date,
  programme_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bookings_tutor_user
  on public.bookings (tutor_user_id, status);

create index if not exists idx_bookings_school_admin_user
  on public.bookings (school_admin_user_id, created_at desc);

create table if not exists public.booking_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  tutor_user_id uuid not null references public.users(id) on delete cascade,
  session_start timestamptz not null,
  session_end timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_booking_sessions_time_range check (session_end > session_start)
);

create index if not exists idx_booking_sessions_tutor_time
  on public.booking_sessions (tutor_user_id, session_start, session_end);

create index if not exists idx_booking_sessions_booking
  on public.booking_sessions (booking_id);

