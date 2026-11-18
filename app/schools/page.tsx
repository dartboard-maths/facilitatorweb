import type { Metadata } from "next";
import { SchoolMap, type SchoolQuery } from "../../components/school/SchoolMap";

export const metadata: Metadata = {
  title: "Find a school",
  description: "School locations and stats from the Region Inspector map.",
};

type SchoolsPageProps = {
  searchParams?: SchoolQuery;
};

export default function SchoolsPage({ searchParams }: SchoolsPageProps) {
  return (
    <main>
      <SchoolMap query={searchParams ?? {}} />
    </main>
  );
}
