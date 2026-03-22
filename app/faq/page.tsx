import { CmsBrochurePage, buildCmsBrochureMetadata } from "../../components/cms/CmsBrochurePage";

export async function generateMetadata() {
  return buildCmsBrochureMetadata("faq");
}

export default async function FaqPage() {
  return CmsBrochurePage({ slug: "faq" });
}
