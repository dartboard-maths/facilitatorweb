-- Sample users + tutors for local testing around Goodwood, Athlone, and Bradford (BD2 3FJ).
-- Safe to run multiple times.

-- Reset current rows before inserting the baseline sample dataset.
delete from public.tutors;
delete from public.users;

with generated_tutors as (
  select
    a.area_slug,
    a.area_name,
    s.i as idx,
    md5(format('%s-%s', a.area_slug, s.i)) as seed,
    (
      substr(md5(format('%s-%s', a.area_slug, s.i)), 1, 8) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.i)), 9, 4) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.i)), 13, 4) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.i)), 17, 4) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.i)), 21, 12)
    )::uuid as user_id,
    format('%s.tutor.%s@example.com', a.area_slug, lpad(s.i::text, 2, '0')) as email,
    format('%s Tutor %s', a.area_name, lpad(s.i::text, 2, '0')) as full_name,
    format(
      'Tutor based near %s. Focused support for local learners (profile %s).',
      a.area_name,
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
    (220 + (s.i * 18) + (a.area_idx * 7))::numeric(10, 2) as hourly_rate,
    (
      a.center_lat +
      ((get_byte(decode(md5(format('%s-%s', a.area_slug, s.i)), 'hex'), 0)::int - 127.5) / 12000.0)
    )::double precision as latitude,
    (
      a.center_lon +
      ((get_byte(decode(md5(format('%s-%s', a.area_slug, s.i)), 'hex'), 1)::int - 127.5) / 10000.0)
    )::double precision as longitude,
    (8 + ((s.i - 1) % 6) * 2)::integer as travel_radius_km
  from (
    values
      (1, 'goodwood', 'Goodwood', -33.9057::double precision, 18.5535::double precision),
      (2, 'athlone', 'Athlone', -33.9636::double precision, 18.5008::double precision),
      (3, 'bd2-kimberwicke', '37 Kimberwicke Walk, BD2 3FJ', 53.8142::double precision, -1.7249::double precision)
  ) as a(area_idx, area_slug, area_name, center_lat, center_lon)
  cross join generate_series(1, 20) as s(i)
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
    a.area_slug,
    a.area_name,
    s.i as idx,
    md5(format('%s-%s', a.area_slug, s.i)) as seed,
    (
      substr(md5(format('%s-%s', a.area_slug, s.i)), 1, 8) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.i)), 9, 4) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.i)), 13, 4) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.i)), 17, 4) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.i)), 21, 12)
    )::uuid as user_id,
    format('%s Tutor %s', a.area_name, lpad(s.i::text, 2, '0')) as name,
    format(
      'Tutor based near %s. Focused support for local learners (profile %s).',
      a.area_name,
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
    (220 + (s.i * 18) + (a.area_idx * 7))::numeric(10, 2) as hourly_rate,
    (
      a.center_lat +
      ((get_byte(decode(md5(format('%s-%s', a.area_slug, s.i)), 'hex'), 0)::int - 127.5) / 12000.0)
    )::double precision as latitude,
    (
      a.center_lon +
      ((get_byte(decode(md5(format('%s-%s', a.area_slug, s.i)), 'hex'), 1)::int - 127.5) / 10000.0)
    )::double precision as longitude,
    (8 + ((s.i - 1) % 6) * 2)::integer as travel_radius_km
  from (
    values
      (1, 'goodwood', 'Goodwood', -33.9057::double precision, 18.5535::double precision),
      (2, 'athlone', 'Athlone', -33.9636::double precision, 18.5008::double precision),
      (3, 'bd2-kimberwicke', '37 Kimberwicke Walk, BD2 3FJ', 53.8142::double precision, -1.7249::double precision)
  ) as a(area_idx, area_slug, area_name, center_lat, center_lon)
  cross join generate_series(1, 20) as s(i)
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
