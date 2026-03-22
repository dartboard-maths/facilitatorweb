import type { SupabaseClient } from "@supabase/supabase-js";

const LOW_RATING_THRESHOLD = 2;
const RECENT_DAYS = 30;
const LOW_STREAK_COUNT = 5;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/**
 * Heuristic: many consecutive very low ratings from the same reviewer may indicate abuse.
 * Does not auto-reject; flags row for moderation queue review.
 */
export async function shouldFlagReviewerAsAnomalous(
  supabase: SupabaseClient,
  reviewerUserId: string,
  newRating: number,
): Promise<boolean> {
  if (newRating > LOW_RATING_THRESHOLD) {
    return false;
  }

  const { data: recent, error } = await supabase
    .from("booking_reviews")
    .select("rating")
    .eq("reviewer_user_id", reviewerUserId)
    .gte("created_at", isoDaysAgo(RECENT_DAYS))
    .order("created_at", { ascending: false })
    .limit(24);

  if (error || !recent?.length) {
    return false;
  }

  const lows = recent.filter((r) => (r.rating as number) <= LOW_RATING_THRESHOLD).length;
  return lows >= LOW_STREAK_COUNT;
}
