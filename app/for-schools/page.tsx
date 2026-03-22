import { CmsBrochurePage, buildCmsBrochureMetadata } from "../../components/cms/CmsBrochurePage";

export async function generateMetadata() {
  return buildCmsBrochureMetadata("for-schools");
}

export default async function ForSchoolsPage() {
  return CmsBrochurePage({ slug: "for-schools" });
}
