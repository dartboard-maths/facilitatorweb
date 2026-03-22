-- Emergency: insert a school row manually if Moodle SSO payload is still empty (e.g. dev only).
-- Replace values with your Moodle School Builder data.

insert into public.schools (
  id,
  name,
  address_line1,
  address_line2,
  suburb,
  city,
  state,
  postcode,
  country,
  latitude,
  longitude,
  synced_at
)
values (
  'DEM001',
  'Demo DBM School',
  '45 Molteno Street',
  '',
  'Vasco',
  'Goodwood',
  'Western Cape',
  '7460',
  'ZA',
  -33.906056,
  18.564472,
  now()
)
on conflict (id) do update set
  name = excluded.name,
  address_line1 = excluded.address_line1,
  address_line2 = excluded.address_line2,
  suburb = excluded.suburb,
  city = excluded.city,
  state = excluded.state,
  postcode = excluded.postcode,
  country = excluded.country,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  synced_at = now();
