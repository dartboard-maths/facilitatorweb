"use server";

import { revalidatePath } from "next/cache";
import { getMarketplaceSession } from "../../lib/auth/session";
import { createAdminClient } from "../../lib/supabase/admin";

export type BookingActionState = {
  error?: string;
  success?: string;
};

type BookingRow = {
  id: string;
  status: string;
  school_admin_user_id: string;
  tutor_user_id: string;
  school_id: string;
};

type ActorRole = "school_admin" | "tutor";
type BookingDecision = "accept" | "decline" | "request_changes";

function canTransitionStatus(currentStatus: string, nextStatus: string): boolean {
  const normalized = currentStatus.trim().toLowerCase();
  const allowed = new Set(["pending", "changes_requested"]);
  if (!allowed.has(normalized)) {
    return false;
  }
  if (nextStatus === "accepted") {
    return true;
  }
  if (nextStatus === "declined") {
    return true;
  }
  if (nextStatus === "changes_requested") {
    return true;
  }
  return false;
}

function actorLabel(role: ActorRole): string {
  return role === "tutor" ? "Tutor" : "School admin";
}

function normalizeMessage(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

async function resolveBookingActorRole(input: {
  booking: BookingRow;
  session: NonNullable<Awaited<ReturnType<typeof getMarketplaceSession>>>;
}): Promise<ActorRole | null> {
  const { booking, session } = input;
  if (session.sub === booking.tutor_user_id) {
    return "tutor";
  }

  if (!session.isSchoolAdmin) {
    return null;
  }

  if (session.sub === booking.school_admin_user_id) {
    return "school_admin";
  }

  if (session.managedSchoolIds.includes(booking.school_id)) {
    return "school_admin";
  }

  return null;
}

export async function postBookingMessage(
  _prevState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const session = await getMarketplaceSession();
  if (!session) {
    return { error: "You must be signed in to send a message." };
  }

  const bookingId = normalizeMessage(formData.get("booking_id"));
  const body = normalizeMessage(formData.get("body"));
  if (!bookingId || !body) {
    return { error: "Booking and message body are required." };
  }

  const supabase = createAdminClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,status,school_admin_user_id,tutor_user_id,school_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError) return { error: bookingError.message };
  if (!booking) return { error: "Booking not found." };

  const actorRole = await resolveBookingActorRole({
    booking: booking as BookingRow,
    session,
  });
  if (!actorRole) {
    return { error: "You do not have permission to message on this booking." };
  }

  const { error: messageError } = await supabase.from("booking_messages").insert({
    booking_id: bookingId,
    sender_user_id: session.sub,
    sender_role: actorRole,
    message_type: "comment",
    body,
  });
  if (messageError) {
    if (/booking_messages/i.test(messageError.message)) {
      return { error: "Booking messages are not available yet. Apply migration 015." };
    }
    return { error: messageError.message };
  }

  const { error: activityError } = await supabase
    .from("bookings")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (activityError) {
    return { error: activityError.message };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: "Message sent." };
}

export async function submitBookingDecision(
  _prevState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const session = await getMarketplaceSession();
  if (!session) {
    return { error: "You must be signed in to update bookings." };
  }

  const bookingId = normalizeMessage(formData.get("booking_id"));
  const decision = normalizeMessage(formData.get("decision")) as BookingDecision;
  const note = normalizeMessage(formData.get("note"));

  if (!bookingId) {
    return { error: "Missing booking id." };
  }
  if (!["accept", "decline", "request_changes"].includes(decision)) {
    return { error: "Invalid booking decision." };
  }

  const supabase = createAdminClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,status,school_admin_user_id,tutor_user_id,school_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError) return { error: bookingError.message };
  if (!booking) return { error: "Booking not found." };

  const actorRole = await resolveBookingActorRole({
    booking: booking as BookingRow,
    session,
  });
  if (!actorRole) {
    return { error: "You do not have permission to update this booking." };
  }

  const nextStatus =
    decision === "accept"
      ? "accepted"
      : decision === "decline"
        ? "declined"
        : "changes_requested";

  if (!canTransitionStatus(booking.status, nextStatus)) {
    return { error: `Cannot move booking from '${booking.status}' to '${nextStatus}'.` };
  }

  if (decision === "decline") {
    const { error: cancelSessionsError } = await supabase
      .from("booking_sessions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("booking_id", bookingId)
      .neq("status", "cancelled");
    if (cancelSessionsError) {
      return { error: cancelSessionsError.message };
    }
  }

  const bookingPatch: Record<string, unknown> = {
    status: nextStatus,
    proposed_by: nextStatus === "changes_requested" ? session.sub : null,
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error: bookingUpdateError } = await supabase
    .from("bookings")
    .update(bookingPatch)
    .eq("id", bookingId);
  if (bookingUpdateError) {
    return { error: bookingUpdateError.message };
  }

  const statusMessageBody =
    note ||
    `${actorLabel(actorRole)} set booking status to '${nextStatus.replace("_", " ")}'.`;
  const { error: messageError } = await supabase.from("booking_messages").insert({
    booking_id: bookingId,
    sender_user_id: session.sub,
    sender_role: actorRole,
    message_type: "status_change",
    body: statusMessageBody,
  });
  if (messageError && !/booking_messages/i.test(messageError.message)) {
    return { error: messageError.message };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: `Booking ${nextStatus.replace("_", " ")}.` };
}
