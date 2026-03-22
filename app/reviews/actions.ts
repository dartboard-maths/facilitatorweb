"use server";

import { revalidatePath } from "next/cache";
import { getMarketplaceSession } from "../../lib/auth/session";
import { getMarketplaceViewRoleFromCookies } from "../../lib/auth/view-role";
import { shouldFlagReviewerAsAnomalous } from "../../lib/reviews/anomaly";
import { isBookingStatusReviewable, clampRating } from "../../lib/reviews/booking-review-policy";
import { moderateRecommendationText } from "../../lib/reviews/openai-moderation";
import { refreshBookingReviewPairVisibility } from "../../lib/reviews/sync-public-visible";
import { resolveActorRoleForBookingAction } from "../../lib/bookings/resolve-booking-actor-role";
import { createAdminClient } from "../../lib/supabase/admin";

export type ReviewActionState = {
  error?: string;
  success?: string;
};

function normalizeMessage(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

export async function submitBookingReview(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await getMarketplaceSession();
  if (!session) {
    return { error: "You must be signed in to submit a review." };
  }

  const bookingId = normalizeMessage(formData.get("booking_id"));
  const ratingRaw = Number(normalizeMessage(formData.get("rating")));
  const recommendationText = normalizeMessage(formData.get("recommendation_text"));

  if (!bookingId) {
    return { error: "Missing booking." };
  }
  if (!Number.isFinite(ratingRaw) || ratingRaw < 1 || ratingRaw > 5) {
    return { error: "Rating must be between 1 and 5." };
  }
  const rating = clampRating(ratingRaw);

  const supabase = createAdminClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,status,school_id,tutor_user_id,school_admin_user_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    return { error: bookingError.message };
  }
  if (!booking) {
    return { error: "Booking not found." };
  }

  const status = String(booking.status).trim().toLowerCase();
  if (!isBookingStatusReviewable(status)) {
    return {
      error:
        "Reviews are only available after the booking is completed or cancelled. Use “Mark booking complete” when the work is finished.",
    };
  }

  const row = booking as {
    school_id: string;
    tutor_user_id: string;
    school_admin_user_id: string;
  };

  const preferredRole = await getMarketplaceViewRoleFromCookies();
  const actorRole = resolveActorRoleForBookingAction(session, row, preferredRole);
  if (!actorRole) {
    return { error: "You are not a participant on this booking." };
  }

  const reviewerUserId = session.sub;
  const reviewerRole = actorRole;
  const revieweeRole = actorRole === "tutor" ? ("school_admin" as const) : ("tutor" as const);
  const revieweeUserId = actorRole === "tutor" ? row.school_admin_user_id : row.tutor_user_id;

  if (reviewerRole === "tutor" && reviewerUserId !== row.tutor_user_id) {
    return { error: "Only the tutor on this booking can submit a review as Tutor." };
  }

  const { data: existing } = await supabase
    .from("booking_reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("reviewer_role", reviewerRole)
    .maybeSingle();

  if (existing) {
    return { error: "You have already submitted a review for this booking in this role." };
  }

  let moderationStatus: "pending" | "approved" = "approved";
  if (recommendationText.length > 0) {
    const mod = await moderateRecommendationText(recommendationText);
    moderationStatus = mod === "pending" ? "pending" : "approved";
  }

  const anomalyFlagged = await shouldFlagReviewerAsAnomalous(supabase, reviewerUserId, rating);
  if (anomalyFlagged) {
    moderationStatus = "pending";
  }

  const { error: insertError } = await supabase.from("booking_reviews").insert({
    booking_id: bookingId,
    reviewer_user_id: reviewerUserId,
    reviewee_user_id: revieweeUserId,
    reviewer_role: reviewerRole,
    reviewee_role: revieweeRole,
    rating,
    recommendation_text: recommendationText || null,
    moderation_status: moderationStatus,
    anomaly_flagged: anomalyFlagged,
    public_visible: false,
  });

  if (insertError) {
    if (/booking_reviews|unique|duplicate/i.test(insertError.message ?? "")) {
      return { error: "You have already submitted a review for this booking." };
    }
    return { error: insertError.message };
  }

  await refreshBookingReviewPairVisibility(supabase, bookingId);

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/tutors");

  if (moderationStatus === "pending") {
    return {
      success:
        "Review received and is pending moderation (automated check or manual review). It will appear publicly once approved and both parties have reviewed.",
    };
  }

  return { success: "Thank you — your review has been saved." };
}
