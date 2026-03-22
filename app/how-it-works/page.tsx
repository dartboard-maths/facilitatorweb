import { CmsBrochurePage, buildCmsBrochureMetadata } from "../../components/cms/CmsBrochurePage";

export async function generateMetadata() {
  return buildCmsBrochureMetadata("how-it-works");
}

export default async function HowItWorksPage() {
  return CmsBrochurePage({ slug: "how-it-works" });
}
