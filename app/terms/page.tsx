import { CmsBrochurePage, buildCmsBrochureMetadata } from "../../components/cms/CmsBrochurePage";

export async function generateMetadata() {
  return buildCmsBrochureMetadata("terms");
}

export default async function TermsPage() {
  return CmsBrochurePage({ slug: "terms" });
}
