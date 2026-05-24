import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CmsPageRenderer } from "./CmsPageRenderer";
import { CmsSiteHeader } from "./CmsSiteChrome";
import { getMarketplaceSession } from "../../lib/auth/session";
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
  const [page, globalSettings, session] = await Promise.all([
    getCmsPageBySlug(slug),
    getCmsGlobalSettings(),
    getMarketplaceSession(),
  ]);

  const roleHomeHref = session ? "/role-select" : "/sign-in";
  const roleHomeLabel = session ? "View Profile" : "Sign in";
  const renderContext = {
    contextualLinks: {
      "#sign-in": {
        href: roleHomeHref,
        label: roleHomeLabel,
      },
    },
  };

  if (!page) {
    notFound();
  }

  return (
    <>
      <CmsSiteHeader header={globalSettings?.header} renderContext={renderContext} />
      <main>
        <CmsPageRenderer components={page.components} renderContext={renderContext} />
      </main>
    </>
  );
}
