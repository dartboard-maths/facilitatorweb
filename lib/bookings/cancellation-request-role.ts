import type { BookingActorRole } from "./resolve-booking-actor-role";

export type CancellationMessageFallback = {
  /** From `booking_messages.sender_role` where `message_type = cancellation_request` (when column not stored). */
  cancellationRequestSenderRole?: string | null;
};

export type BookingCancellationFields = {
  tutor_user_id: string;
  school_admin_user_id: string;
  cancellation_requested_by: string | null;
  cancellation_requested_as_role?: BookingActorRole | null;
};

/**
 * Role used when the cancellation was submitted (persisted on new requests; inferred when tutor ≠ school admin user ids).
 */
export function getCancellationRequestedRole(booking: BookingCancellationFields): BookingActorRole | null {
  const stored = booking.cancellation_requested_as_role;
  if (stored === "tutor" || stored === "school_admin") {
    return stored;
  }
  const by = booking.cancellation_requested_by;
  if (!by) {
    return null;
  }
  const tutorId = booking.tutor_user_id;
  const adminId = booking.school_admin_user_id;
  if (by === tutorId && by !== adminId) {
    return "tutor";
  }
  if (by === adminId && by !== tutorId) {
    return "school_admin";
  }
  return null;
}

function roleLabel(role: BookingActorRole): string {
  return role === "tutor" ? "Tutor" : "School admin";
}

/**
 * Effective role used to submit the cancellation (DB column, id inference, or thread message).
 */
export function getEffectiveCancellationRequestedRole(
  booking: BookingCancellationFields,
  fallback?: CancellationMessageFallback,
): BookingActorRole | null {
  const fromBooking = getCancellationRequestedRole(booking);
  if (fromBooking) {
    return fromBooking;
  }
  const sr = fallback?.cancellationRequestSenderRole;
  if (sr === "tutor" || sr === "school_admin") {
    return sr;
  }
  return null;
}

/**
 * True if the current viewer should see counterparty UX (Respond + Accept), not originator-only copy.
 * For dual-role same user: compares {@link viewerViewRole} to the role that initiated the request.
 */
export function viewerIsCounterpartyForCancellation(input: {
  viewerUserId: string;
  viewerViewRole: BookingActorRole;
  booking: BookingCancellationFields;
  messageFallback?: CancellationMessageFallback;
}): boolean {
  const { viewerUserId, viewerViewRole, booking, messageFallback } = input;
  const by = booking.cancellation_requested_by;
  if (!by) {
    return false;
  }
  if (by !== viewerUserId) {
    return true;
  }
  const requested = getEffectiveCancellationRequestedRole(booking, messageFallback);
  if (!requested) {
    // Same account + both booking slots same user id, no stored role and no message — cannot tell; hide Accept.
    return false;
  }
  return viewerViewRole !== requested;
}

/** Label for who initiated (for banner copy). */
export function getCancellationInitiatorRoleLabel(
  booking: BookingCancellationFields,
  fallback?: CancellationMessageFallback,
): string {
  const r = getEffectiveCancellationRequestedRole(booking, fallback);
  if (r) {
    return roleLabel(r);
  }
  const by = booking.cancellation_requested_by;
  if (!by) {
    return "Participant";
  }
  if (by === booking.tutor_user_id && by !== booking.school_admin_user_id) {
    return "Tutor";
  }
  if (by === booking.school_admin_user_id && by !== booking.tutor_user_id) {
    return "School admin";
  }
  return "Participant";
}
