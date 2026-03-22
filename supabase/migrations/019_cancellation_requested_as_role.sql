-- Which marketplace role initiated the cancellation (required when tutor_user_id = school_admin_user_id).

alter table public.bookings
  add column if not exists cancellation_requested_as_role text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_cancellation_requested_as_role_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_cancellation_requested_as_role_check
      check (cancellation_requested_as_role is null or cancellation_requested_as_role in ('tutor', 'school_admin'));
  end if;
end $$;

comment on column public.bookings.cancellation_requested_as_role is
  'Role (tutor vs school admin) used when submitting the cancellation request; distinguishes dual-role same user.';

-- Backfill when requester id uniquely maps to tutor vs school admin on the booking.
update public.bookings b
set cancellation_requested_as_role = case
  when b.cancellation_requested_by is null then null
  when b.cancellation_requested_by = b.tutor_user_id
    and b.cancellation_requested_by is distinct from b.school_admin_user_id
    then 'tutor'
  when b.cancellation_requested_by = b.school_admin_user_id
    and b.cancellation_requested_by is distinct from b.tutor_user_id
    then 'school_admin'
  else null
end
where b.cancellation_requested_by is not null
  and b.cancellation_requested_as_role is null;
