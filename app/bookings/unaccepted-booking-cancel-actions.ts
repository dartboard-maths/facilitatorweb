"use server";

import { revalidatePath } from "next/cache";
import { getMarketplaceSession } from "../../lib/auth/session";
import { getMarketplaceViewRoleFromCookies } from "../../lib/auth/view-role";
import { resolveActorRoleForBookingAction } from "../../lib/bookings/resolve-booking-actor-role";
import { createAdminClient } from "../../lib/supabase/admin";
import type { BookingActionState } from "./actions";

type BookingRow = {
  id: string;
  status: string;
  school_admin_user_id: string;
  tutor_user_id: string;
  school_id: string;
};

function normalizeMessage(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function actorLabel(role: "school_admin" | "tutor"): string {
  return role === "tutor" ? "Tutor" : "School admin";
}

/**
 * Immediate cancel for pending / changes_requested bookings (no counterparty approval).
 * Separate from submitBookingDecision / decline.
 */
export async function cancelUnacceptedBooking(
  _prevState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const session = await getMarketplaceSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const bookingId = normalizeMessage(formData.get("booking_id"));
  const note = normalizeMessage(formData.get("note"));

  if (!bookingId) {
    return { error: "Missing booking id." };
  }

  const supabase = createAdminClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,status,school_admin_user_id,tutor_user_id,school_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) return { error: bookingError.message };
  if (!booking) {
    return { error: "Booking not found." };
  }

  const row = booking as BookingRow;
  const preferredRole = await getMarketplaceViewRoleFromCookies();
  const actorRole = resolveActorRoleForBookingAction(session, row, preferredRole);
  if (!actorRole) {
    return { error: "You do not have permission to update this booking." };
  }

  const status = row.status.trim().toLowerCase();
  if (status !== "pending" && status !== "changes_requested") {
    return { error: "This booking cannot be cancelled here. Use the decision bar or active cancellation flow." };
  }

  const { error: cancelSessionsError } = await supabase
    .from("booking_sessions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("booking_id", bookingId)
    .neq("status", "cancelled");

  if (cancelSessionsError) {
    return { error: cancelSessionsError.message };
  }

  const now = new Date().toISOString();
  const { error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      last_activity_at: now,
      updated_at: now,
    })
    .eq("id", bookingId);

  if (bookingUpdateError) {
    return { error: bookingUpdateError.message };
  }

  const body =
    note ||
    `${actorLabel(actorRole)} cancelled this booking (was ${status.replace(/_/g, " ")}).`;
  const { error: messageError } = await supabase.from("booking_messages").insert({
    booking_id: bookingId,
    sender_user_id: session.sub,
    sender_role: actorRole,
    message_type: "status_change",
    body,
  });

  if (messageError) {
    if (/booking_messages/i.test(messageError.message)) {
      return { error: "Booking messages are not available. Apply migration 015." };
    }
    return { error: messageError.message };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: "Booking cancelled." };
}
