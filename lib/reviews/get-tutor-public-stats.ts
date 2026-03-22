import type { SupabaseClient } from "@supabase/supabase-js";
import { bayesianAverageStars } from "./aggregate-ratings";

export type TutorPublicRatingSummary = {
  avgDisplay: number;
  count: number;
};

/**
 * Public aggregates for tutor user_ids (Bayesian-smoothed mean + raw count).
 */
export async function getPublicRatingSummariesForTutorUserIds(
  supabase: SupabaseClient,
  tutorUserIds: string[],
): Promise<Map<string, TutorPublicRatingSummary>> {
  const result = new Map<string, TutorPublicRatingSummary>();
  if (tutorUserIds.length === 0) {
    return result;
  }

  const unique = Array.from(new Set(tutorUserIds));
  const { data, error } = await supabase
    .from("booking_reviews")
    .select("reviewee_user_id, rating")
    .in("reviewee_user_id", unique)
    .eq("reviewee_role", "tutor")
    .eq("public_visible", true)
    .eq("moderation_status", "approved");

  if (error || !data?.length) {
    return result;
  }

  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const row of data) {
    const uid = row.reviewee_user_id as string;
    const r = Number(row.rating);
    if (!Number.isFinite(r)) continue;
    sums.set(uid, (sums.get(uid) ?? 0) + r);
    counts.set(uid, (counts.get(uid) ?? 0) + 1);
  }

  for (const uid of unique) {
    const count = counts.get(uid) ?? 0;
    if (count === 0) continue;
    const sum = sums.get(uid) ?? 0;
    result.set(uid, {
      count,
      avgDisplay: bayesianAverageStars(sum, count),
    });
  }

  return result;
}
