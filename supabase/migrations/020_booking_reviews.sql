-- Bilateral booking reviews (tutor <-> school). See lib/reviews/booking-review-policy.ts

create table if not exists public.booking_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_user_id uuid not null references public.users(id) on delete cascade,
  reviewee_user_id uuid not null references public.users(id) on delete cascade,
  rating smallint not null,
  recommendation_text text,
  moderation_status text not null default 'approved',
  public_visible boolean not null default false,
  anomaly_flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_reviews_rating_range check (rating >= 1 and rating <= 5),
  constraint booking_reviews_moderation_status_check
    check (moderation_status in ('pending', 'approved', 'rejected', 'flagged')),
  constraint booking_reviews_unique_reviewer unique (booking_id, reviewer_user_id)
);

comment on table public.booking_reviews is
  'One review per reviewer per booking; public_visible when both parties reviewed and rows approved.';

create index if not exists idx_booking_reviews_booking on public.booking_reviews (booking_id);
create index if not exists idx_booking_reviews_reviewee on public.booking_reviews (reviewee_user_id)
  where public_visible = true and moderation_status = 'approved';
create index if not exists idx_booking_reviews_reviewer on public.booking_reviews (reviewer_user_id);
create index if not exists idx_booking_reviews_anomaly on public.booking_reviews (anomaly_flagged)
  where anomaly_flagged = true;

create or replace function public.enforce_booking_review_parties()
returns trigger
language plpgsql
as $$
declare
  tid uuid;
  sid uuid;
begin
  select b.tutor_user_id, b.school_admin_user_id
    into tid, sid
  from public.bookings b
  where b.id = new.booking_id;

  if tid is null then
    raise exception 'Booking not found for booking_reviews';
  end if;

  if new.reviewer_user_id not in (tid, sid) or new.reviewee_user_id not in (tid, sid) then
    raise exception 'Reviewer and reviewee must be the tutor and school admin on this booking';
  end if;

  if new.reviewer_user_id = new.reviewee_user_id then
    raise exception 'Cannot review yourself';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_booking_reviews_enforce_parties on public.booking_reviews;
create trigger trg_booking_reviews_enforce_parties
  before insert or update on public.booking_reviews
  for each row
  execute function public.enforce_booking_review_parties();

-- public_visible is set in app when both parties have approved reviews (see app/reviews/actions.ts).
-- Access control is enforced in Next.js server actions (marketplace session), not RLS — same pattern as other tables.
