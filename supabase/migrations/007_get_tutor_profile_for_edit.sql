create or replace function public.get_tutor_profile_for_edit(p_user_id uuid)
returns table(
  name text,
  bio text,
  subjects text[],
  levels text[],
  hourly_rate numeric,
  travel_radius_km integer,
  photo_url text,
  latitude double precision,
  longitude double precision
)
language sql
security definer
set search_path = public
as $$
  select
    t.name,
    t.bio,
    t.subjects,
    t.levels,
    t.hourly_rate,
    t.travel_radius_km,
    t.photo_url,
    st_y(t.location::geometry) as latitude,
    st_x(t.location::geometry) as longitude
  from public.tutors t
  where t.user_id = p_user_id
  limit 1
$$;

revoke all on function public.get_tutor_profile_for_edit(uuid) from public;
grant execute on function public.get_tutor_profile_for_edit(uuid) to authenticated;

