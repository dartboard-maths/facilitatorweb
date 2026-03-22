"use server";

import { revalidatePath } from "next/cache";
import { getMarketplaceSession } from "../../lib/auth/session";
import { getMarketplaceViewRoleFromCookies } from "../../lib/auth/view-role";
import { resolveActorRoleForBookingAction } from "../../lib/bookings/resolve-booking-actor-role";
import { createAdminClient } from "../../lib/supabase/admin";

export type LifecycleActionState = {
  error?: string;
  success?: string;
};

const MARK_COMPLETE_FROM = new Set(["accepted", "confirmed"]);

function normalizeMessage(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

/**
 * Marks an in-progress booking as completed so both parties can leave reviews.
 */
export async function markBookingCompleted(
  _prevState: LifecycleActionState,
  formData: FormData,
): Promise<LifecycleActionState> {
  const session = await getMarketplaceSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const bookingId = normalizeMessage(formData.get("booking_id"));
  if (!bookingId) {
    return { error: "Missing booking id." };
  }

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
  if (!MARK_COMPLETE_FROM.has(status)) {
    return {
      error: "Only accepted or confirmed bookings can be marked complete.",
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
    return { error: "You do not have permission to update this booking." };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "completed",
      updated_at: now,
      last_activity_at: now,
    })
    .eq("id", bookingId)
    .in("status", ["accepted", "confirmed"]);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);

  return { success: "Booking marked complete. You can now submit a review." };
}
