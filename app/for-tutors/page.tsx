import { CmsBrochurePage, buildCmsBrochureMetadata } from "../../components/cms/CmsBrochurePage";

export async function generateMetadata() {
  return buildCmsBrochureMetadata("for-tutors");
}

export default async function ForTutorsPage() {
  return CmsBrochurePage({ slug: "for-tutors" });
}
