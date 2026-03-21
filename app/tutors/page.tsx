import { TutorMap } from "../../components/tutor/TutorMap";
import { getMarketplaceSession } from "../../lib/auth/session";

export default async function TutorsSearchPage() {
  const session = await getMarketplaceSession();
  const canBook = Boolean(session?.isSchoolAdmin);

  return (
    <main>
      <TutorMap initialRadiusKm={20} canBook={canBook} />
    </main>
  );
}
