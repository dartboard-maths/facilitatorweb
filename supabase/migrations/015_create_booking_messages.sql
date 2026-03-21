alter table public.bookings
  add column if not exists proposed_by uuid references public.users(id) on delete set null,
  add column if not exists last_activity_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'bookings_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      drop constraint bookings_status_check;
  end if;
end $$;

alter table public.bookings
  add constraint bookings_status_check
  check (
    status in (
      'pending',
      'accepted',
      'confirmed',
      'declined',
      'cancelled',
      'completed',
      'changes_requested'
    )
  );

create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('school_admin', 'tutor', 'system')),
  message_type text not null check (message_type in ('comment', 'status_change', 'booking_created')),
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_messages_booking_created
  on public.booking_messages (booking_id, created_at);

create index if not exists idx_bookings_last_activity
  on public.bookings (last_activity_at desc);
