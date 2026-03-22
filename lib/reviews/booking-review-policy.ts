/**
 * Tutor/school booking reviews: eligibility, visibility, and bilateral display rules.
 * See migration 020_booking_reviews.sql and app/reviews/actions.ts.
 */

/** Bookings in these states may receive reviews (engagement ended or formally closed). */
export const REVIEWABLE_BOOKING_STATUSES = new Set([
  "completed",
  "cancelled",
]);

export function isBookingStatusReviewable(status: string): boolean {
  return REVIEWABLE_BOOKING_STATUSES.has(status.trim().toLowerCase());
}

/**
 * Public profile / aggregate: only reviews with both parties having submitted for the same booking
 * are shown on the tutor public aggregate (see `public_visible` on rows).
 * Single-party reviews stay private to participants until the pair is complete.
 */

export const RATING_MIN = 1;
export const RATING_MAX = 5;

export function clampRating(value: number): number {
  return Math.min(RATING_MAX, Math.max(RATING_MIN, Math.round(value)));
}
