import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CmsPageRenderer } from "./CmsPageRenderer";
import { CmsSiteFooter, CmsSiteHeader } from "./CmsSiteChrome";
import { getCmsGlobalSettings, getCmsPageBySlug } from "../../lib/cms/contentful";

type CmsBrochurePageProps = {
  slug: string;
};

export async function buildCmsBrochureMetadata(slug: string): Promise<Metadata> {
  const page = await getCmsPageBySlug(slug);
  if (!page) {
    return { title: "Not Found" };
  }

  return {
    title: page.metadata.title || page.title,
    description: page.metadata.description || "",
    keywords: page.metadata.keywords || "",
  };
}

export async function CmsBrochurePage({ slug }: CmsBrochurePageProps) {
  const [page, globalSettings] = await Promise.all([
    getCmsPageBySlug(slug),
    getCmsGlobalSettings(),
  ]);

  if (!page) {
    notFound();
  }

  return (
    <>
      <CmsSiteHeader header={globalSettings?.header} />
      <main>
        <CmsPageRenderer components={page.components} />
      </main>
      <CmsSiteFooter footer={globalSettings?.footer} />
    </>
  );
}
