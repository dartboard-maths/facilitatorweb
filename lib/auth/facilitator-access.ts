export type FacilitatorAccessSession = {
  isFacilitatorCertified?: boolean;
};

export function hasTutorMarketplaceAccess(session: FacilitatorAccessSession): boolean {
  return Boolean(session.isFacilitatorCertified);
}

export function getMoodleFacilitatorCourseUrl(): string {
  const explicit = process.env.MOODLE_FACILITATOR_COURSE_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const entryUrl = process.env.MOODLE_SSO_ENTRY_URL?.trim();
  if (!entryUrl) {
    return "";
  }

  try {
    const base = new URL(entryUrl);
    base.pathname = "/course/view.php";
    base.search = "idnumber=DBMU01";
    base.hash = "";
    return base.toString();
  } catch {
    return "";
  }
}
