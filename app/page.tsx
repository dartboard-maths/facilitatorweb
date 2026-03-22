import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CmsPageRenderer } from "../components/cms/CmsPageRenderer";
import { CmsSiteFooter, CmsSiteHeader } from "../components/cms/CmsSiteChrome";
import { getMarketplaceSession } from "../lib/auth/session";
import { getCmsGlobalSettings, getCmsPageBySlug } from "../lib/cms/contentful";

const FALLBACK_HOME_TITLE = "Edu Placement";
const FALLBACK_HOME_DESCRIPTION =
  "Connect tutors and learners with trusted, location-aware matching.";

export async function generateMetadata(): Promise<Metadata> {
  const homePage = await getCmsPageBySlug("home");

  return {
    title: homePage?.metadata.title || FALLBACK_HOME_TITLE,
    description: homePage?.metadata.description || FALLBACK_HOME_DESCRIPTION,
    keywords: homePage?.metadata.keywords || "",
  };
}

type HomeRoleNavProps = {
  roleHomeHref: string;
  roleHomeLabel: string;
};

function FallbackHome({ roleHomeHref, roleHomeLabel }: HomeRoleNavProps) {
  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6 text-center">
          <Image
            src="/images/logo.png"
            alt="Edu Placement logo"
            width={420}
            height={390}
            priority
            className="mb-3 img-fluid"
          />
          <h1 className="display-5 fw-semibold mb-2">Edu Placement</h1>
          <p className="text-secondary mb-4">
            Connect tutors and learners with trusted, location-aware matching.
          </p>
          <nav className="d-flex justify-content-center flex-wrap gap-2">
            <Link href="/" className="btn btn-link">
              Home
            </Link>
            <Link href="/tutors" className="btn btn-link">
              Tutors
            </Link>
            <Link href={roleHomeHref} className="btn btn-outline-primary">
              {roleHomeLabel}
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}

export default async function HomePage() {
  const session = await getMarketplaceSession();
  const roleHomeHref = session ? "/role-select" : "/sign-in";
  const roleHomeLabel = session ? "Choose role" : "Sign in";
  const renderContext = {
    contextualLinks: {
      "#sign-in": {
        href: roleHomeHref,
        label: roleHomeLabel,
      },
    },
  };

  const [homePage, globalSettings] = await Promise.all([
    getCmsPageBySlug("home"),
    getCmsGlobalSettings(),
  ]);

  if (!homePage) {
    return <FallbackHome roleHomeHref={roleHomeHref} roleHomeLabel={roleHomeLabel} />;
  }

  return (
    <>
      <CmsSiteHeader header={globalSettings?.header} />
      <main>
        <CmsPageRenderer components={homePage.components} renderContext={renderContext} />
      </main>
      <CmsSiteFooter footer={globalSettings?.footer} />
    </>
  );
}
