import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SchoolMap, type SchoolQuery } from "../../components/school/SchoolMap";
import { getMarketplaceSession } from "../../lib/auth/session";
import { fetchInspectorSchools } from "../../lib/schools/inspector-directory";
import { fetchPublicSchools } from "../../lib/schools/public-directory";

export const metadata: Metadata = {
  title: "Find a school",
  description: "Browse school locations and summary stats, or open the signed-in region inspector.",
};

type SchoolsPageProps = {
  searchParams?: SchoolQuery & { sso?: string };
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
  const { sso, ...query } = searchParams ?? {};
  if (sso === "1") {
    redirect(`/api/auth/moodle/start?next=${encodeURIComponent(schoolsNextPath(query))}`);
  }
  const session = await getMarketplaceSession();
  if (!session) {
    const directory = await fetchPublicSchools();
    return (
      <main>
        <SchoolMap
          mode="public"
          query={query}
          pins={directory.schools}
          access={directory.access === "ready" ? "ready" : "unavailable"}
        />
      </main>
    );
  }
  const directory = await fetchInspectorSchools(session.moodleUserId);
  return (
    <main>
      <SchoolMap mode="inspector" query={query} pins={directory.schools} access={directory.access} />
    </main>
  );
}
