"use server";

import { revalidatePath } from "next/cache";
import { getMarketplaceSession } from "../../lib/auth/session";
import { getMarketplaceViewRoleFromCookies } from "../../lib/auth/view-role";
import { resolveActorRoleForBookingAction } from "../../lib/bookings/resolve-booking-actor-role";
import { createAdminClient } from "../../lib/supabase/admin";
import {
  schoolCatalogRowToLocationData,
  schoolLocationToSnapshotPayload,
} from "../../lib/schools/school-location";
import { normalizeMarketplaceSchoolId } from "../../lib/schools/school-id";

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

function actorLabel(role: "school_admin" | "tutor"): string {
  return role === "tutor" ? "Tutor" : "School admin";
}

function normalizeMessage(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
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

  const preferredRole = await getMarketplaceViewRoleFromCookies();
  const actorRole = resolveActorRoleForBookingAction(session, booking as BookingRow, preferredRole);
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

  const preferredRole = await getMarketplaceViewRoleFromCookies();
  const actorRole = resolveActorRoleForBookingAction(session, booking as BookingRow, preferredRole);
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

/**
 * Copies the latest row from public.schools onto this booking's school_snapshot
 * (after cohort admin has signed in via Moodle SSO at least once).
 */
export async function refreshBookingSchoolSnapshot(
  _prevState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
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
    .select("id,school_id,tutor_user_id,school_admin_user_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError) return { error: bookingError.message };
  if (!booking) return { error: "Booking not found." };

  const preferredRole = await getMarketplaceViewRoleFromCookies();
  const actorRole = resolveActorRoleForBookingAction(session, booking as BookingRow, preferredRole);
  if (!actorRole) {
    return { error: "You do not have permission to update this booking." };
  }

  if (actorRole !== "school_admin") {
    return {
      error:
        "Refreshing the school address is a school admin action. Switch to School admin via Choose role.",
    };
  }

  const schoolKey = normalizeMarketplaceSchoolId(booking.school_id);
  const { data: schoolRow, error: schoolError } = await supabase
    .from("schools")
    .select("id,name,address_line1,address_line2,suburb,city,state,postcode,country,latitude,longitude")
    .eq("id", schoolKey)
    .maybeSingle();

  if (schoolError) return { error: schoolError.message };
  if (!schoolRow) {
    return {
      error:
        "No school directory row yet. Ask a cohort admin to save the address in Moodle (School Builder → School Details), then sign in to the marketplace once via Moodle SSO.",
    };
  }

  const loc = schoolCatalogRowToLocationData(schoolRow as Record<string, unknown>, schoolKey);
  if (!loc) {
    return {
      error:
        "School directory has no usable address or coordinates yet. Complete the address in Moodle School Builder.",
    };
  }

  const snapshot = schoolLocationToSnapshotPayload(loc);
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ school_snapshot: snapshot, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (updateError) {
    if (/school_snapshot|column|schema/i.test(updateError.message ?? "")) {
      return { error: "Apply migration 017 (school_snapshot on bookings) in Supabase." };
    }
    return { error: updateError.message };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: "School location details loaded onto this booking." };
}
