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
