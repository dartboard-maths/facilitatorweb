# Booking reviews — moderation and abuse flags

## Behaviour

- One review **per marketplace role** per booking (`UNIQUE (booking_id, reviewer_role)`). If the same person is both tutor and school admin on one booking, they submit **two** reviews (one as tutor, one as school admin).
- **Public tutor map aggregates** use only rows with `public_visible = true` and `moderation_status = 'approved'`.
- `public_visible` becomes `true` only when **both** the tutor and the school admin have submitted **approved** reviews for the same booking (see `lib/reviews/sync-public-visible.ts`). Visiting the booking detail page re-runs sync so manual DB approvals take effect.

## Automated checks

- **OpenAI Moderation API** (optional): set `OPENAI_API_KEY`. Recommendation text may be set to `moderation_status = 'pending'`.
- **Reviewer heuristic**: many low ratings in a short window sets `anomaly_flagged = true` and forces `pending` (see `lib/reviews/anomaly.ts`).

## SQL — list reviews needing attention

```sql
select r.id, r.booking_id, r.reviewer_user_id, r.reviewee_user_id, r.rating,
       r.moderation_status, r.anomaly_flagged, r.created_at, r.recommendation_text
from public.booking_reviews r
where r.moderation_status = 'pending'
   or r.anomaly_flagged = true
order by r.created_at desc;
```

## Approve manually (Supabase SQL)

```sql
update public.booking_reviews
set moderation_status = 'approved', updated_at = now()
where id = '<review_uuid>';
```

Then open the booking detail page in the app (or call sync in code) so `public_visible` updates when both sides are approved.

## Aggregates

- Display average uses **Bayesian smoothing** for small samples (`lib/reviews/aggregate-ratings.ts`).
- **Wilson lower bound** helper is available for future “trusted score” UI.
