-- Denormalized Moodle school / category address at booking time so tutors and admins
-- always see location context for decisions (independent of later catalog edits or SSO cache).

alter table public.bookings
  add column if not exists school_snapshot jsonb;

comment on column public.bookings.school_snapshot is
  'School name, address, and coordinates copied from public.schools when the booking was created.';

-- Backfill existing bookings so tutors see address context without re-creating requests.
update public.bookings b
set school_snapshot = jsonb_build_object(
  'name', coalesce(s.name, ''),
  'address_line1', coalesce(s.address_line1, ''),
  'address_line2', coalesce(s.address_line2, ''),
  'suburb', coalesce(s.suburb, ''),
  'city', coalesce(s.city, ''),
  'state', coalesce(s.state, ''),
  'postcode', coalesce(s.postcode, ''),
  'country', coalesce(s.country, ''),
  'latitude', s.latitude,
  'longitude', s.longitude
)
from public.schools s
where s.id = b.school_id
  and b.school_snapshot is null;
