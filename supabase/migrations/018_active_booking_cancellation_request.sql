-- Active booking cancellation request (two-party flow). See app/bookings/active-cancellation-actions.ts

alter table public.bookings
  add column if not exists cancellation_requested_by uuid references public.users(id) on delete set null,
  add column if not exists cancellation_request_comment text;

comment on column public.bookings.cancellation_requested_by is
  'User who submitted a cancellation request while status was accepted.';
comment on column public.bookings.cancellation_request_comment is
  'Comment supplied with the cancellation request (mirrors thread message).';

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
      'changes_requested',
      'cancellation_requested'
    )
  );

-- Extend booking_messages.message_type for cancellation flow
do $$
declare
  r record;
begin
  for r in
    select c.conname as name
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'booking_messages'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%message_type%'
  loop
    execute format('alter table public.booking_messages drop constraint %I', r.name);
  end loop;
end $$;

alter table public.booking_messages
  add constraint booking_messages_message_type_check
  check (
    message_type in (
      'comment',
      'status_change',
      'booking_created',
      'cancellation_request',
      'cancellation_accepted'
    )
  );
