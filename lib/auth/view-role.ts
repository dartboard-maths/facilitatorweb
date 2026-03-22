import { cookies } from "next/headers";

/** Persisted when the user picks Tutor vs School admin via `/role-select` or the switcher. */
export const MARKETPLACE_VIEW_ROLE_COOKIE = "marketplace_view_role";

export type MarketplaceViewRole = "tutor" | "school_admin";

export function parseMarketplaceViewRole(value: string | undefined): MarketplaceViewRole | null {
  if (value === "tutor" || value === "school_admin") {
    return value;
  }
  return null;
}

export async function getMarketplaceViewRoleFromCookies(): Promise<MarketplaceViewRole | null> {
  const cookieStore = await cookies();
  return parseMarketplaceViewRole(cookieStore.get(MARKETPLACE_VIEW_ROLE_COOKIE)?.value);
}

export async function clearMarketplaceViewRoleCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(MARKETPLACE_VIEW_ROLE_COOKIE);
}

export type MarketplaceSessionForViewRole = {
  isSchoolAdmin: boolean;
};

/**
 * Inbox / tutors list: which “hat” the UI uses when the user can be both cohort admin and tutor.
 */
export function resolveInboxViewRole(
  session: MarketplaceSessionForViewRole,
  opts: { hasTutorProfile: boolean; cookieRole: MarketplaceViewRole | null },
): MarketplaceViewRole {
  if (!session.isSchoolAdmin) {
    return "tutor";
  }
  if (!opts.hasTutorProfile) {
    return "school_admin";
  }
  if (opts.cookieRole === "tutor") {
    return "tutor";
  }
  if (opts.cookieRole === "school_admin") {
    return "school_admin";
  }
  return "school_admin";
}
