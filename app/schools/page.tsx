import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SchoolMap, type SchoolQuery } from "../../components/school/SchoolMap";
import { getMarketplaceSession } from "../../lib/auth/session";
import { fetchInspectorSchools } from "../../lib/schools/inspector-directory";

export const metadata: Metadata = {
  title: "Find a school",
  description: "School locations and stats for the signed-in region inspector.",
};

type SchoolsPageProps = {
  searchParams?: SchoolQuery;
};

function schoolsNextPath(query: SchoolQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === "string" && value !== "") {
      params.set(key, value);
    }
  });
  const search = params.toString();
  return search ? `/schools?${search}` : "/schools";
}

export default async function SchoolsPage({ searchParams }: SchoolsPageProps) {
  const query = searchParams ?? {};
  const session = await getMarketplaceSession();
  if (!session) {
    redirect(`/api/auth/moodle/start?next=${encodeURIComponent(schoolsNextPath(query))}`);
  }
  const directory = await fetchInspectorSchools(session.moodleUserId);
  return (
    <main>
      <SchoolMap query={query} pins={directory.schools} access={directory.access} />
    </main>
  );
}
