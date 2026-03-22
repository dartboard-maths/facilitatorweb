import { CmsBrochurePage, buildCmsBrochureMetadata } from "../../components/cms/CmsBrochurePage";

export async function generateMetadata() {
  return buildCmsBrochureMetadata("privacy-policy");
}

export default async function PrivacyPolicyPage() {
  return CmsBrochurePage({ slug: "privacy-policy" });
}
