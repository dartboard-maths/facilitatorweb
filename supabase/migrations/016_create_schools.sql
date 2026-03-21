-- Cached school metadata synced from Moodle (School Builder) via SSO.
-- Key matches bookings.school_id (Moodle course category idnumber, uppercased).

create table if not exists public.schools (
  id text primary key,
  name text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  suburb text not null default '',
  city text not null default '',
  state text not null default '',
  postcode text not null default '',
  country text not null default '',
  latitude double precision,
  longitude double precision,
  synced_at timestamptz not null default now()
);

create index if not exists idx_schools_synced_at on public.schools (synced_at desc);
