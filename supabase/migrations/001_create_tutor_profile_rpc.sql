create extension if not exists postgis;
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key,
  email text unique,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Example tutors table for this form shape.
create table if not exists public.tutors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  name text not null,
  bio text not null,
  subjects text[] not null default '{}',
  levels text[] not null default '{}',
  hourly_rate numeric(10, 2) not null check (hourly_rate >= 0),
  location geography(Point, 4326) not null,
  travel_radius_km integer not null default 0 check (travel_radius_km >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tutors_location_gist
  on public.tutors using gist (location);

create or replace function public.create_tutor_profile(
  p_user_id uuid,
  p_name text,
  p_bio text,
  p_subjects text[],
  p_levels text[],
  p_hourly_rate numeric,
  p_latitude double precision,
  p_longitude double precision,
  p_travel_radius_km integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tutor_id uuid;
begin
  insert into public.tutors (
    user_id,
    name,
    bio,
    subjects,
    levels,
    hourly_rate,
    location,
    travel_radius_km
  )
  values (
    p_user_id,
    p_name,
    p_bio,
    coalesce(p_subjects, '{}'),
    coalesce(p_levels, '{}'),
    p_hourly_rate,
    st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography,
    p_travel_radius_km
  )
  on conflict (user_id)
  do update
  set
    name = excluded.name,
    bio = excluded.bio,
    subjects = excluded.subjects,
    levels = excluded.levels,
    hourly_rate = excluded.hourly_rate,
    location = excluded.location,
    travel_radius_km = excluded.travel_radius_km,
    updated_at = now()
  returning id into v_tutor_id;

  return v_tutor_id;
end;
$$;

revoke all on function public.create_tutor_profile(
  uuid, text, text, text[], text[], numeric, double precision, double precision, integer
) from public;
grant execute on function public.create_tutor_profile(
  uuid, text, text, text[], text[], numeric, double precision, double precision, integer
) to authenticated;
