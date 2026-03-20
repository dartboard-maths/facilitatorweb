-- Sample users + tutors for local testing around Goodwood, Cape Town.
-- Safe to run multiple times.

-- Reset current rows before inserting the baseline sample dataset.
delete from public.tutors;
delete from public.users;

with generated_tutors as (
  select
    s.i as idx,
    (
      substr(md5(format('goodwood-%s', s.i)), 1, 8) || '-' ||
      substr(md5(format('goodwood-%s', s.i)), 9, 4) || '-' ||
      substr(md5(format('goodwood-%s', s.i)), 13, 4) || '-' ||
      substr(md5(format('goodwood-%s', s.i)), 17, 4) || '-' ||
      substr(md5(format('goodwood-%s', s.i)), 21, 12)
    )::uuid as user_id,
    format('goodwood.tutor.%s@example.com', lpad(s.i::text, 2, '0')) as email,
    format('Goodwood Tutor %s', lpad(s.i::text, 2, '0')) as full_name,
    format(
      'Tutor based near Goodwood, Cape Town. Focused support for local learners (profile %s).',
      lpad(s.i::text, 2, '0')
    ) as bio,
    case ((s.i - 1) % 5)
      when 0 then array['Mathematics', 'Physical Sciences']
      when 1 then array['English', 'Life Sciences']
      when 2 then array['Accounting', 'Economics']
      when 3 then array['Geography', 'History']
      else array['Mathematical Literacy', 'Business Studies']
    end as subjects,
    case
      when s.i <= 6 then array['Primary School', 'Middle School']
      when s.i <= 14 then array['Middle School', 'High School']
      else array['High School', 'University']
    end as levels,
    (220 + (s.i * 18))::numeric(10, 2) as hourly_rate,
    (-33.9057 + ((s.i - 10.5) * 0.0022))::double precision as latitude,
    (18.5535 + ((s.i - 10.5) * 0.0028))::double precision as longitude,
    (8 + ((s.i - 1) % 6) * 2)::integer as travel_radius_km
  from generate_series(1, 20) as s(i)
)
insert into public.users (id, email, full_name)
select user_id, email, full_name
from generated_tutors
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  updated_at = now();

with generated_tutors as (
  select
    s.i as idx,
    (
      substr(md5(format('goodwood-%s', s.i)), 1, 8) || '-' ||
      substr(md5(format('goodwood-%s', s.i)), 9, 4) || '-' ||
      substr(md5(format('goodwood-%s', s.i)), 13, 4) || '-' ||
      substr(md5(format('goodwood-%s', s.i)), 17, 4) || '-' ||
      substr(md5(format('goodwood-%s', s.i)), 21, 12)
    )::uuid as user_id,
    format('Goodwood Tutor %s', lpad(s.i::text, 2, '0')) as name,
    format(
      'Tutor based near Goodwood, Cape Town. Focused support for local learners (profile %s).',
      lpad(s.i::text, 2, '0')
    ) as bio,
    case ((s.i - 1) % 5)
      when 0 then array['Mathematics', 'Physical Sciences']
      when 1 then array['English', 'Life Sciences']
      when 2 then array['Accounting', 'Economics']
      when 3 then array['Geography', 'History']
      else array['Mathematical Literacy', 'Business Studies']
    end as subjects,
    case
      when s.i <= 6 then array['Primary School', 'Middle School']
      when s.i <= 14 then array['Middle School', 'High School']
      else array['High School', 'University']
    end as levels,
    (220 + (s.i * 18))::numeric(10, 2) as hourly_rate,
    (-33.9057 + ((s.i - 10.5) * 0.0022))::double precision as latitude,
    (18.5535 + ((s.i - 10.5) * 0.0028))::double precision as longitude,
    (8 + ((s.i - 1) % 6) * 2)::integer as travel_radius_km
  from generate_series(1, 20) as s(i)
)
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
select
  user_id,
  name,
  bio,
  subjects,
  levels,
  hourly_rate,
  st_setsrid(st_makepoint(longitude, latitude), 4326)::geography,
  travel_radius_km
from generated_tutors
on conflict (user_id) do update
set
  name = excluded.name,
  bio = excluded.bio,
  subjects = excluded.subjects,
  levels = excluded.levels,
  hourly_rate = excluded.hourly_rate,
  location = excluded.location,
  travel_radius_km = excluded.travel_radius_km,
  updated_at = now();
