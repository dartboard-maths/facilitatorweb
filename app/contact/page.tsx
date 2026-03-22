import { CmsBrochurePage, buildCmsBrochureMetadata } from "../../components/cms/CmsBrochurePage";

export async function generateMetadata() {
  return buildCmsBrochureMetadata("contact");
}

export default async function ContactBrochurePage() {
  return CmsBrochurePage({ slug: "contact" });
}
