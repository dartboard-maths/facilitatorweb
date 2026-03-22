-- Run these in Supabase → SQL Editor (or psql) to verify school sync from Moodle SSO.
-- Saving address in Moodle School Builder does NOT write to Supabase directly.
-- Data appears in public.schools only after a cohort admin signs in to the marketplace
-- via Moodle SSO (local/wpsso/marketplace.php → /api/auth/moodle/callback).

-- 1) Table exists and row count
select count(*) as schools_row_count from public.schools;

-- 2) DEM001 row (expected after successful SSO sync)
select *
from public.schools
where id = 'DEM001';

-- Case-insensitive match (if id was stored with different casing)
select *
from public.schools
where upper(id) = 'DEM001';

-- 3) Booking + snapshot for that school
select id, school_id, school_snapshot, created_at
from public.bookings
where upper(school_id) = 'DEM001'
order by created_at desc
limit 10;

-- 4) Users with DEM001 in managed_school_ids (from SSO)
select id, email, is_school_admin, managed_school_ids
from public.users
where 'DEM001' = any (managed_school_ids);

-- If (2) returns no rows but (4) shows DEM001: Moodle did not send school profiles
-- or the callback could not upsert. Deploy latest local/wpsso/marketplace.php (TRIM idnumber
-- match + JSON flags), sign out of the marketplace, sign in again via Moodle SSO, then re-run (2).
-- Optional: apply manual-seed-public-schools.sql for local testing only.
