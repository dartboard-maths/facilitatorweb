import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sets public_visible on all rows for a booking when both tutor and school admin
 * have submitted approved reviews; otherwise clears public_visible.
 */
export async function refreshBookingReviewPairVisibility(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<void> {
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("tutor_user_id,school_admin_user_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (bErr || !booking) {
    return;
  }

  const tid = booking.tutor_user_id as string;
  const sid = booking.school_admin_user_id as string;

  const { data: rows } = await supabase
    .from("booking_reviews")
    .select("reviewer_user_id,reviewer_role,moderation_status")
    .eq("booking_id", bookingId);

  const list = rows ?? [];
  const tutorDone = list.some(
    (r) => r.reviewer_role === "tutor" && r.moderation_status === "approved",
  );
  const schoolDone = list.some(
    (r) => r.reviewer_role === "school_admin" && r.moderation_status === "approved",
  );
  const pub = tutorDone && schoolDone;

  await supabase
    .from("booking_reviews")
    .update({
      public_visible: pub,
      updated_at: new Date().toISOString(),
    })
    .eq("booking_id", bookingId);
}
