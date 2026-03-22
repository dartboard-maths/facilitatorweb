import { TutorMap } from "../../components/tutor/TutorMap";
import { getMarketplaceSession } from "../../lib/auth/session";
import { getMarketplaceViewRoleFromCookies, resolveInboxViewRole } from "../../lib/auth/view-role";
import { createAdminClient } from "../../lib/supabase/admin";

export default async function TutorsSearchPage() {
  const session = await getMarketplaceSession();

  let canBook = false;
  if (session?.isSchoolAdmin) {
    const supabase = createAdminClient();
    const { data: tutorRow } = await supabase
      .from("tutors")
      .select("id")
      .eq("user_id", session.sub)
      .maybeSingle();
    const hasTutorProfile = Boolean(tutorRow);
    const cookieRole = await getMarketplaceViewRoleFromCookies();
    const inboxView = resolveInboxViewRole(session, { hasTutorProfile, cookieRole });
    canBook = inboxView === "school_admin";
  }

  return (
    <main>
      <TutorMap initialRadiusKm={20} canBook={canBook} />
    </main>
  );
}
