-- Sample users + tutors for local testing around Goodwood, Athlone, and Bradford (BD2 3FJ).
-- Safe to run multiple times.

-- Reset current rows before inserting the baseline sample dataset.
delete from public.tutors;
delete from public.users;

with generated_tutors as (
  select
    a.area_slug,
    a.area_name,
    s.idx,
    s.ring_km,
    md5(format('%s-%s', a.area_slug, s.idx)) as seed,
    (
      substr(md5(format('%s-%s', a.area_slug, s.idx)), 1, 8) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.idx)), 9, 4) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.idx)), 13, 4) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.idx)), 17, 4) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.idx)), 21, 12)
    )::uuid as user_id,
    format('%s.tutor.%s@example.com', a.area_slug, lpad(s.idx::text, 2, '0')) as email,
    format('%s Tutor %s', a.area_name, lpad(s.idx::text, 2, '0')) as full_name,
    case
      when s.ring_km is null then
        format(
          'Tutor based near %s. Focused support for local learners (profile %s).',
          a.area_name,
          lpad(s.idx::text, 2, '0')
        )
      else
        format(
          'Distance test tutor near %s, positioned around %s km from center to validate radius filters.',
          a.area_name,
          s.ring_km::text
        )
    end as bio,
    case ((s.idx - 1) % 5)
      when 0 then array['Mathematics', 'Physical Sciences']
      when 1 then array['English', 'Life Sciences']
      when 2 then array['Accounting', 'Economics']
      when 3 then array['Geography', 'History']
      else array['Mathematical Literacy', 'Business Studies']
    end as subjects,
    case
      when s.idx <= 8 then array['Primary School', 'Middle School']
      when s.idx <= 18 then array['Middle School', 'High School']
      else array['High School', 'University']
    end as levels,
    (220 + (s.idx * 14) + (a.area_idx * 9))::numeric(10, 2) as hourly_rate,
    case
      when s.ring_km is null then
        (
          a.center_lat +
          ((get_byte(decode(md5(format('%s-%s', a.area_slug, s.idx)), 'hex'), 0)::int - 127.5) / 11000.0)
        )::double precision
      else
        st_y(
          st_project(
            st_setsrid(st_makepoint(a.center_lon, a.center_lat), 4326)::geography,
            s.ring_km * 1000.0,
            radians((get_byte(decode(md5(format('%s-%s', a.area_slug, s.idx)), 'hex'), 1)::double precision / 255.0) * 360.0)
          )::geometry
        )::double precision
    end as latitude,
    case
      when s.ring_km is null then
        (
          a.center_lon +
          ((get_byte(decode(md5(format('%s-%s', a.area_slug, s.idx)), 'hex'), 1)::int - 127.5) / 9000.0)
        )::double precision
      else
        st_x(
          st_project(
            st_setsrid(st_makepoint(a.center_lon, a.center_lat), 4326)::geography,
            s.ring_km * 1000.0,
            radians((get_byte(decode(md5(format('%s-%s', a.area_slug, s.idx)), 'hex'), 1)::double precision / 255.0) * 360.0)
          )::geometry
        )::double precision
    end as longitude,
    case
      when s.ring_km is null then (8 + ((s.idx - 1) % 6) * 2)::integer
      else greatest(10, (s.ring_km + 2)::integer)
    end as travel_radius_km
  from (
    values
      (1, 'goodwood', 'Goodwood', -33.9057::double precision, 18.5535::double precision),
      (2, 'athlone', 'Athlone', -33.9636::double precision, 18.5008::double precision),
      (3, 'bd2-kimberwicke', '37 Kimberwicke Walk, BD2 3FJ', 53.8142::double precision, -1.7249::double precision)
  ) as a(area_idx, area_slug, area_name, center_lat, center_lon)
  cross join (
    select i as idx, null::double precision as ring_km
    from generate_series(1, 20) as i
    union all
    select 21, 5::double precision
    union all
    select 22, 10::double precision
    union all
    select 23, 20::double precision
    union all
    select 24, 50::double precision
    union all
    select 25, 100::double precision
  ) as s
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
    s.idx,
    s.ring_km,
    md5(format('%s-%s', a.area_slug, s.idx)) as seed,
    (
      substr(md5(format('%s-%s', a.area_slug, s.idx)), 1, 8) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.idx)), 9, 4) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.idx)), 13, 4) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.idx)), 17, 4) || '-' ||
      substr(md5(format('%s-%s', a.area_slug, s.idx)), 21, 12)
    )::uuid as user_id,
    format('%s Tutor %s', a.area_name, lpad(s.idx::text, 2, '0')) as name,
    case
      when s.ring_km is null then
        format(
          'Tutor based near %s. Focused support for local learners (profile %s).',
          a.area_name,
          lpad(s.idx::text, 2, '0')
        )
      else
        format(
          'Distance test tutor near %s, positioned around %s km from center to validate radius filters.',
          a.area_name,
          s.ring_km::text
        )
    end as bio,
    case ((s.idx - 1) % 5)
      when 0 then array['Mathematics', 'Physical Sciences']
      when 1 then array['English', 'Life Sciences']
      when 2 then array['Accounting', 'Economics']
      when 3 then array['Geography', 'History']
      else array['Mathematical Literacy', 'Business Studies']
    end as subjects,
    case
      when s.idx <= 8 then array['Primary School', 'Middle School']
      when s.idx <= 18 then array['Middle School', 'High School']
      else array['High School', 'University']
    end as levels,
    (220 + (s.idx * 14) + (a.area_idx * 9))::numeric(10, 2) as hourly_rate,
    case
      when s.ring_km is null then
        (
          a.center_lat +
          ((get_byte(decode(md5(format('%s-%s', a.area_slug, s.idx)), 'hex'), 0)::int - 127.5) / 11000.0)
        )::double precision
      else
        st_y(
          st_project(
            st_setsrid(st_makepoint(a.center_lon, a.center_lat), 4326)::geography,
            s.ring_km * 1000.0,
            radians((get_byte(decode(md5(format('%s-%s', a.area_slug, s.idx)), 'hex'), 1)::double precision / 255.0) * 360.0)
          )::geometry
        )::double precision
    end as latitude,
    case
      when s.ring_km is null then
        (
          a.center_lon +
          ((get_byte(decode(md5(format('%s-%s', a.area_slug, s.idx)), 'hex'), 1)::int - 127.5) / 9000.0)
        )::double precision
      else
        st_x(
          st_project(
            st_setsrid(st_makepoint(a.center_lon, a.center_lat), 4326)::geography,
            s.ring_km * 1000.0,
            radians((get_byte(decode(md5(format('%s-%s', a.area_slug, s.idx)), 'hex'), 1)::double precision / 255.0) * 360.0)
          )::geometry
        )::double precision
    end as longitude,
    case
      when s.ring_km is null then (8 + ((s.idx - 1) % 6) * 2)::integer
      else greatest(10, (s.ring_km + 2)::integer)
    end as travel_radius_km
  from (
    values
      (1, 'goodwood', 'Goodwood', -33.9057::double precision, 18.5535::double precision),
      (2, 'athlone', 'Athlone', -33.9636::double precision, 18.5008::double precision),
      (3, 'bd2-kimberwicke', '37 Kimberwicke Walk, BD2 3FJ', 53.8142::double precision, -1.7249::double precision)
  ) as a(area_idx, area_slug, area_name, center_lat, center_lon)
  cross join (
    select i as idx, null::double precision as ring_km
    from generate_series(1, 20) as i
    union all
    select 21, 5::double precision
    union all
    select 22, 10::double precision
    union all
    select 23, 20::double precision
    union all
    select 24, 50::double precision
    union all
    select 25, 100::double precision
  ) as s
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
