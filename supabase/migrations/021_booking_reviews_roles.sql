-- Role-based parties (supports same user as tutor + school admin on one booking).

alter table public.booking_reviews
  add column if not exists reviewer_role text,
  add column if not exists reviewee_role text;

update public.booking_reviews br
set
  reviewer_role = case
    when br.reviewer_user_id = b.tutor_user_id then 'tutor'
    else 'school_admin'
  end,
  reviewee_role = case
    when br.reviewee_user_id = b.tutor_user_id then 'tutor'
    else 'school_admin'
  end
from public.bookings b
where b.id = br.booking_id
  and br.reviewer_role is null;

alter table public.booking_reviews
  alter column reviewer_role set not null,
  alter column reviewee_role set not null;

alter table public.booking_reviews
  drop constraint if exists booking_reviews_reviewer_role_check;

alter table public.booking_reviews
  add constraint booking_reviews_reviewer_role_check
  check (reviewer_role in ('tutor', 'school_admin'));

alter table public.booking_reviews
  drop constraint if exists booking_reviews_reviewee_role_check;

alter table public.booking_reviews
  add constraint booking_reviews_reviewee_role_check
  check (reviewee_role in ('tutor', 'school_admin'));

alter table public.booking_reviews
  drop constraint if exists booking_reviews_unique_reviewer;

alter table public.booking_reviews
  add constraint booking_reviews_unique_role_per_booking unique (booking_id, reviewer_role);

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

  if new.reviewer_role = new.reviewee_role then
    raise exception 'Reviewer role and reviewee role must differ';
  end if;

  if new.reviewer_role = 'tutor' then
    if new.reviewer_user_id is distinct from tid then
      raise exception 'Tutor review must be submitted by the tutor on the booking';
    end if;
    if new.reviewee_user_id is distinct from sid or new.reviewee_role is distinct from 'school_admin' then
      raise exception 'Tutor review must rate the school admin on this booking';
    end if;
  elsif new.reviewer_role = 'school_admin' then
    if new.reviewer_user_id is distinct from sid then
      raise exception 'School admin review must be submitted by the school admin on the booking';
    end if;
    if new.reviewee_user_id is distinct from tid or new.reviewee_role is distinct from 'tutor' then
      raise exception 'School admin review must rate the tutor on this booking';
    end if;
  end if;

  return new;
end;
$$;

comment on column public.booking_reviews.reviewer_role is
  'Marketplace role used for this review (tutor vs school admin); unique per booking with reviewer_role.';
comment on column public.booking_reviews.reviewee_role is
  'Role of the party being rated (the other participant in the transaction).';
