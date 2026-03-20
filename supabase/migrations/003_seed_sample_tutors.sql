-- Sample users + tutors for local testing.
-- Safe to run multiple times.

insert into public.users (id, email, full_name)
values
  ('11111111-1111-1111-1111-111111111111', 'ava.math@example.com', 'Ava Chen'),
  ('22222222-2222-2222-2222-222222222222', 'liam.physics@example.com', 'Liam Carter'),
  ('33333333-3333-3333-3333-333333333333', 'zoe.chem@example.com', 'Zoe Park'),
  ('44444444-4444-4444-4444-444444444444', 'noah.bio@example.com', 'Noah Singh'),
  ('55555555-5555-5555-5555-555555555555', 'mia.english@example.com', 'Mia Johnson'),
  ('66666666-6666-6666-6666-666666666666', 'ethan.history@example.com', 'Ethan Moore')
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  updated_at = now();

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
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Ava Chen',
    'Math tutor focused on algebra, calculus, and SAT prep.',
    array['Math', 'Calculus', 'Algebra', 'SAT'],
    array['High School', 'College'],
    65.00,
    st_setsrid(st_makepoint(-122.4194, 37.7749), 4326)::geography,
    15
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Liam Carter',
    'Physics tutor with hands-on problem-solving and exam strategy.',
    array['Physics', 'Mechanics', 'AP Physics'],
    array['High School', 'College'],
    72.00,
    st_setsrid(st_makepoint(-122.4064, 37.7858), 4326)::geography,
    20
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Zoe Park',
    'Chemistry tutor for AP and introductory university chemistry.',
    array['Chemistry', 'Organic Chemistry'],
    array['High School', 'College'],
    68.00,
    st_setsrid(st_makepoint(-122.4313, 37.7689), 4326)::geography,
    18
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Noah Singh',
    'Biology tutor specializing in AP Bio and life sciences.',
    array['Biology', 'Life Science'],
    array['Middle School', 'High School'],
    55.00,
    st_setsrid(st_makepoint(-122.3949, 37.7924), 4326)::geography,
    12
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Mia Johnson',
    'English tutor for writing, reading comprehension, and essays.',
    array['English', 'Writing', 'Reading'],
    array['Middle School', 'High School'],
    50.00,
    st_setsrid(st_makepoint(-122.4477, 37.7694), 4326)::geography,
    10
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'Ethan Moore',
    'History tutor for APUSH, world history, and exam prep.',
    array['History', 'APUSH', 'World History'],
    array['High School'],
    48.00,
    st_setsrid(st_makepoint(-122.4162, 37.7601), 4326)::geography,
    14
  )
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

-- Additional Western Cape sample dataset:
-- 100 tutors total, distributed as 10 tutors in each of 10 locations.
with western_cape_locations as (
  select *
  from (
    values
      (1, 'cape-town', 'Cape Town', -33.9249::double precision, 18.4241::double precision),
      (2, 'stellenbosch', 'Stellenbosch', -33.9321::double precision, 18.8602::double precision),
      (3, 'paarl', 'Paarl', -33.7342::double precision, 18.9620::double precision),
      (4, 'somerset-west', 'Somerset West', -34.0790::double precision, 18.8430::double precision),
      (5, 'hermanus', 'Hermanus', -34.4187::double precision, 19.2345::double precision),
      (6, 'worcester', 'Worcester', -33.6465::double precision, 19.4485::double precision),
      (7, 'george', 'George', -33.9649::double precision, 22.4594::double precision),
      (8, 'mossel-bay', 'Mossel Bay', -34.1831::double precision, 22.1461::double precision),
      (9, 'knysna', 'Knysna', -34.0363::double precision, 23.0471::double precision),
      (10, 'vredenburg', 'Vredenburg', -32.9070::double precision, 17.9897::double precision)
  ) as l(location_idx, location_slug, location_name, latitude, longitude)
),
generated_tutors as (
  select
    (
      substr(md5(format('wc-%s-%s', l.location_slug, s.slot)), 1, 8) || '-' ||
      substr(md5(format('wc-%s-%s', l.location_slug, s.slot)), 9, 4) || '-' ||
      substr(md5(format('wc-%s-%s', l.location_slug, s.slot)), 13, 4) || '-' ||
      substr(md5(format('wc-%s-%s', l.location_slug, s.slot)), 17, 4) || '-' ||
      substr(md5(format('wc-%s-%s', l.location_slug, s.slot)), 21, 12)
    )::uuid as user_id,
    format('wc.%s.%s@example.com', l.location_slug, lpad(s.slot::text, 2, '0')) as email,
    format('%s Tutor %s', l.location_name, lpad(s.slot::text, 2, '0')) as full_name,
    format(
      '%s-based tutor helping learners across core subjects in the Western Cape.',
      l.location_name
    ) as bio,
    case ((s.slot - 1) % 5)
      when 0 then array['Mathematics', 'Physical Sciences']
      when 1 then array['English', 'Life Sciences']
      when 2 then array['Accounting', 'Economics']
      when 3 then array['Geography', 'History']
      else array['Mathematical Literacy', 'Business Studies']
    end as subjects,
    case
      when s.slot <= 3 then array['Primary School', 'Middle School']
      when s.slot <= 7 then array['Middle School', 'High School']
      else array['High School', 'University']
    end as levels,
    (260 + (s.slot * 15) + (l.location_idx * 5))::numeric(10, 2) as hourly_rate,
    (l.latitude + ((s.slot - 5.5) * 0.008))::double precision as latitude,
    (l.longitude + ((s.slot - 5.5) * 0.010))::double precision as longitude,
    (8 + ((s.slot - 1) % 6) * 3)::integer as travel_radius_km
  from western_cape_locations l
  cross join generate_series(1, 10) as s(slot)
)
insert into public.users (id, email, full_name)
select user_id, email, full_name
from generated_tutors
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  updated_at = now();

with western_cape_locations as (
  select *
  from (
    values
      (1, 'cape-town', 'Cape Town', -33.9249::double precision, 18.4241::double precision),
      (2, 'stellenbosch', 'Stellenbosch', -33.9321::double precision, 18.8602::double precision),
      (3, 'paarl', 'Paarl', -33.7342::double precision, 18.9620::double precision),
      (4, 'somerset-west', 'Somerset West', -34.0790::double precision, 18.8430::double precision),
      (5, 'hermanus', 'Hermanus', -34.4187::double precision, 19.2345::double precision),
      (6, 'worcester', 'Worcester', -33.6465::double precision, 19.4485::double precision),
      (7, 'george', 'George', -33.9649::double precision, 22.4594::double precision),
      (8, 'mossel-bay', 'Mossel Bay', -34.1831::double precision, 22.1461::double precision),
      (9, 'knysna', 'Knysna', -34.0363::double precision, 23.0471::double precision),
      (10, 'vredenburg', 'Vredenburg', -32.9070::double precision, 17.9897::double precision)
  ) as l(location_idx, location_slug, location_name, latitude, longitude)
),
generated_tutors as (
  select
    (
      substr(md5(format('wc-%s-%s', l.location_slug, s.slot)), 1, 8) || '-' ||
      substr(md5(format('wc-%s-%s', l.location_slug, s.slot)), 9, 4) || '-' ||
      substr(md5(format('wc-%s-%s', l.location_slug, s.slot)), 13, 4) || '-' ||
      substr(md5(format('wc-%s-%s', l.location_slug, s.slot)), 17, 4) || '-' ||
      substr(md5(format('wc-%s-%s', l.location_slug, s.slot)), 21, 12)
    )::uuid as user_id,
    format('%s Tutor %s', l.location_name, lpad(s.slot::text, 2, '0')) as name,
    format(
      '%s-based tutor helping learners across core subjects in the Western Cape.',
      l.location_name
    ) as bio,
    case ((s.slot - 1) % 5)
      when 0 then array['Mathematics', 'Physical Sciences']
      when 1 then array['English', 'Life Sciences']
      when 2 then array['Accounting', 'Economics']
      when 3 then array['Geography', 'History']
      else array['Mathematical Literacy', 'Business Studies']
    end as subjects,
    case
      when s.slot <= 3 then array['Primary School', 'Middle School']
      when s.slot <= 7 then array['Middle School', 'High School']
      else array['High School', 'University']
    end as levels,
    (260 + (s.slot * 15) + (l.location_idx * 5))::numeric(10, 2) as hourly_rate,
    (l.latitude + ((s.slot - 5.5) * 0.008))::double precision as latitude,
    (l.longitude + ((s.slot - 5.5) * 0.010))::double precision as longitude,
    (8 + ((s.slot - 1) % 6) * 3)::integer as travel_radius_km
  from western_cape_locations l
  cross join generate_series(1, 10) as s(slot)
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
