import type { getMarketplaceSession } from "../auth/session";
import type { MarketplaceViewRole } from "../auth/view-role";
import { normalizeMarketplaceSchoolId } from "../schools/school-id";

export type BookingActorRole = "school_admin" | "tutor";

type Session = NonNullable<Awaited<ReturnType<typeof getMarketplaceSession>>>;

type BookingRow = {
  school_admin_user_id: string;
  tutor_user_id: string;
  school_id: string;
};

/**
 * Returns which booking-side roles the user may use for this booking (OR of capabilities).
 */
export function getEligibleBookingRoles(session: Session, booking: BookingRow): {
  tutor: boolean;
  school_admin: boolean;
} {
  const schoolKey = normalizeMarketplaceSchoolId(booking.school_id);
  const tutor = session.sub === booking.tutor_user_id;
  const school_admin =
    session.isSchoolAdmin &&
    (session.sub === booking.school_admin_user_id || session.managedSchoolIds.includes(schoolKey));
  return { tutor, school_admin };
}

/**
 * Resolves the actor role for server actions and booking detail UI.
 * When the user qualifies as both tutor and school admin on the same booking, the persisted
 * marketplace view role chooses which hat applies; default is school admin.
 */
export function resolveActorRoleForBookingAction(
  session: Session,
  booking: BookingRow,
  preferredRole: MarketplaceViewRole | null,
): BookingActorRole | null {
  const { tutor, school_admin } = getEligibleBookingRoles(session, booking);
  if (!tutor && !school_admin) {
    return null;
  }
  if (tutor && !school_admin) {
    return "tutor";
  }
  if (school_admin && !tutor) {
    return "school_admin";
  }

  if (preferredRole === "tutor" && tutor) {
    return "tutor";
  }
  if (preferredRole === "school_admin" && school_admin) {
    return "school_admin";
  }
  return "school_admin";
}
