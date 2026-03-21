alter table public.tutor_availability_rules
  add column if not exists recurrence_start_date date,
  add column if not exists recurrence_end_date date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tutor_availability_rules_recurrence_range'
  ) then
    alter table public.tutor_availability_rules
      add constraint chk_tutor_availability_rules_recurrence_range
      check (
        recurrence_start_date is null
        or recurrence_end_date is null
        or recurrence_end_date >= recurrence_start_date
      );
  end if;
end $$;

drop function if exists public.get_tutor_availability_for_edit(uuid);

create function public.get_tutor_availability_for_edit(p_user_id uuid)
returns table(
  weekday smallint,
  start_time time,
  end_time time,
  timezone text,
  recurrence_start_date date,
  recurrence_end_date date,
  is_active boolean,
  blocked_dates text
)
language sql
security definer
set search_path = public
as $$
  with rules as (
    select
      r.weekday,
      r.start_time,
      r.end_time,
      r.timezone,
      r.recurrence_start_date,
      r.recurrence_end_date,
      r.is_active
    from public.tutor_availability_rules r
    where r.tutor_user_id = p_user_id
      and r.is_active = true
    order by r.weekday asc
  ),
  blocked as (
    select string_agg(to_char(o.override_date, 'YYYY-MM-DD'), ', ') as blocked_dates
    from public.tutor_availability_overrides o
    where o.tutor_user_id = p_user_id
      and o.is_available = false
  )
  select
    r.weekday,
    r.start_time,
    r.end_time,
    r.timezone,
    r.recurrence_start_date,
    r.recurrence_end_date,
    r.is_active,
    coalesce(b.blocked_dates, '') as blocked_dates
  from rules r
  cross join blocked b
$$;

revoke all on function public.get_tutor_availability_for_edit(uuid) from public;
grant execute on function public.get_tutor_availability_for_edit(uuid) to authenticated;
