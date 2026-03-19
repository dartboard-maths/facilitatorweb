create extension if not exists postgis;

-- Keep geolocation searches fast as tutor volume grows.
create index if not exists idx_tutors_location_gist
  on public.tutors using gist (location);

create index if not exists idx_tutors_hourly_rate
  on public.tutors (hourly_rate);

create or replace function public.search_tutors_within_radius(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_km numeric
)
returns table (
  tutor_id uuid,
  user_id uuid,
  name text,
  bio text,
  subjects text[],
  levels text[],
  hourly_rate numeric,
  travel_radius_km integer,
  distance_km double precision,
  latitude double precision,
  longitude double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id as tutor_id,
    t.user_id,
    t.name,
    t.bio,
    t.subjects,
    t.levels,
    t.hourly_rate,
    t.travel_radius_km,
    st_distance(
      t.location,
      st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography
    ) / 1000.0 as distance_km,
    st_y(t.location::geometry) as latitude,
    st_x(t.location::geometry) as longitude
  from public.tutors t
  where st_dwithin(
    t.location,
    st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography,
    p_radius_km * 1000.0
  )
  order by distance_km asc;
$$;

revoke all on function public.search_tutors_within_radius(double precision, double precision, numeric) from public;
grant execute on function public.search_tutors_within_radius(double precision, double precision, numeric) to anon, authenticated;
