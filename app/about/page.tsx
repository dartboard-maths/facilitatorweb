import { CmsBrochurePage, buildCmsBrochureMetadata } from "../../components/cms/CmsBrochurePage";

export async function generateMetadata() {
  return buildCmsBrochureMetadata("about");
}

export default async function AboutPage() {
  return CmsBrochurePage({ slug: "about" });
}
