"use server";

import { revalidatePath } from "next/cache";
import { getMarketplaceSession } from "../../lib/auth/session";
import { getMarketplaceViewRoleFromCookies } from "../../lib/auth/view-role";
import { getEffectiveCancellationRequestedRole } from "../../lib/bookings/cancellation-request-role";
import { resolveActorRoleForBookingAction } from "../../lib/bookings/resolve-booking-actor-role";
import { createAdminClient } from "../../lib/supabase/admin";
import type { BookingActionState } from "./actions";

type BookingRow = {
  id: string;
  status: string;
  school_admin_user_id: string;
  tutor_user_id: string;
  school_id: string;
  cancellation_requested_by: string | null;
  cancellation_requested_as_role?: "tutor" | "school_admin" | null;
};

function normalizeMessage(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function actorLabel(role: "school_admin" | "tutor"): string {
  return role === "tutor" ? "Tutor" : "School admin";
}

/**
 * Request cancellation of an accepted (active) booking. Other party must accept via
 * {@link acceptCancelActiveBookingRequest}.
 */
export async function submitCancelActiveBookingRequest(
  _prevState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const session = await getMarketplaceSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const bookingId = normalizeMessage(formData.get("booking_id"));
  const comment = normalizeMessage(formData.get("comment"));

  if (!bookingId) {
    return { error: "Missing booking id." };
  }
  if (!comment) {
    return { error: "Please add a comment explaining the cancellation request." };
  }

  const supabase = createAdminClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,status,school_admin_user_id,tutor_user_id,school_id,cancellation_requested_by,cancellation_requested_as_role")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    if (/cancellation_requested_by|cancellation_requested_as_role|schema cache|column/i.test(bookingError.message ?? "")) {
      return { error: "Apply migration 018 (active booking cancellation) in Supabase." };
    }
    return { error: bookingError.message };
  }
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
  if (status !== "accepted") {
    return { error: "Cancellation requests can only be submitted for accepted bookings." };
  }
  if (row.cancellation_requested_by) {
    return { error: "A cancellation request is already pending." };
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status: "cancellation_requested",
    cancellation_requested_by: session.sub,
    cancellation_request_comment: comment,
    cancellation_requested_as_role: actorRole,
    last_activity_at: now,
    updated_at: now,
  };
  const { data: updatedRows, error: updateError } = await supabase
    .from("bookings")
    .update(updatePayload)
    .eq("id", bookingId)
    .eq("status", "accepted")
    .select("id");

  if (updateError) {
    if (/cancellation_requested_by|cancellation_requested_as_role|schema cache|column/i.test(updateError.message ?? "")) {
      return { error: "Apply migrations 018–019 (active booking cancellation) in Supabase." };
    }
    return { error: updateError.message };
  }
  if (!updatedRows?.length) {
    return { error: "Booking is no longer accepted or was updated by someone else." };
  }

  const body = `${actorLabel(actorRole)} requested cancellation: ${comment}`;
  const { error: messageError } = await supabase.from("booking_messages").insert({
    booking_id: bookingId,
    sender_user_id: session.sub,
    sender_role: actorRole,
    message_type: "cancellation_request",
    body,
  });

  if (messageError) {
    if (/cancellation_request|message_type|schema/i.test(messageError.message ?? "")) {
      return { error: "Apply migration 018 (active booking cancellation) in Supabase." };
    }
    if (/booking_messages/i.test(messageError.message)) {
      return { error: "Booking messages are not available. Apply migration 015." };
    }
    return { error: messageError.message };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: "Cancellation request sent to the other party." };
}

/**
 * Counterparty accepts the pending cancellation — booking becomes cancelled; sessions cancelled.
 */
export async function acceptCancelActiveBookingRequest(
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
    .select("id,status,school_admin_user_id,tutor_user_id,school_id,cancellation_requested_by,cancellation_requested_as_role")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    if (/cancellation_requested_by|cancellation_requested_as_role|schema cache|column/i.test(bookingError.message ?? "")) {
      return { error: "Apply migration 018 (active booking cancellation) in Supabase." };
    }
    return { error: bookingError.message };
  }
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
  if (status !== "cancellation_requested") {
    return { error: "No pending cancellation request for this booking." };
  }

  const requesterId = row.cancellation_requested_by;
  if (!requesterId) {
    return { error: "Cancellation request data is incomplete." };
  }

  let requestedAsRole = getEffectiveCancellationRequestedRole(row);
  if (
    !requestedAsRole &&
    requesterId === session.sub &&
    row.tutor_user_id === row.school_admin_user_id
  ) {
    const { data: cancelMsg } = await supabase
      .from("booking_messages")
      .select("sender_role")
      .eq("booking_id", bookingId)
      .eq("message_type", "cancellation_request")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    requestedAsRole = getEffectiveCancellationRequestedRole(row, {
      cancellationRequestSenderRole: cancelMsg?.sender_role,
    });
  }

  if (requesterId === session.sub) {
    if (requestedAsRole && actorRole === requestedAsRole) {
      return {
        error:
          "You requested this cancellation in your current role. Switch to Tutor or School admin via Choose role so the other party can accept — or accept yourself using your other role.",
      };
    }
    if (!requestedAsRole && row.tutor_user_id === row.school_admin_user_id) {
      return {
        error:
          "Could not tell which role started this request. Apply migration 019 in Supabase, or remove and re-submit the cancellation request.",
      };
    }
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
  const { data: cancelledRows, error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_requested_by: null,
      cancellation_request_comment: null,
      cancellation_requested_as_role: null,
      last_activity_at: now,
      updated_at: now,
    })
    .eq("id", bookingId)
    .eq("status", "cancellation_requested")
    .select("id");

  if (bookingUpdateError) {
    if (/cancellation_requested_by|schema cache|column/i.test(bookingUpdateError.message ?? "")) {
      return { error: "Apply migration 018 (active booking cancellation) in Supabase." };
    }
    return { error: bookingUpdateError.message };
  }
  if (!cancelledRows?.length) {
    return { error: "Booking is no longer pending cancellation or was updated by someone else." };
  }

  const body =
    note ||
    `${actorLabel(actorRole)} accepted the cancellation request. The booking is now cancelled.`;
  const { error: messageError } = await supabase.from("booking_messages").insert({
    booking_id: bookingId,
    sender_user_id: session.sub,
    sender_role: actorRole,
    message_type: "cancellation_accepted",
    body,
  });

  if (messageError) {
    if (/cancellation_accepted|message_type|schema/i.test(messageError.message ?? "")) {
      return { error: "Apply migration 018 (active booking cancellation) in Supabase." };
    }
    if (/booking_messages/i.test(messageError.message)) {
      return { error: "Booking messages are not available. Apply migration 015." };
    }
    return { error: messageError.message };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: "Cancellation accepted. This booking is now cancelled." };
}
