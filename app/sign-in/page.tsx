import Link from "next/link";
import { CmsPageRenderer } from "../../components/cms/CmsPageRenderer";
import { getCmsPageBySlug } from "../../lib/cms/contentful";
import { getMarketplaceSession } from "../../lib/auth/session";

type SignInPageProps = {
  searchParams?: {
    next?: string;
    error?: string;
  };
};

const errorLabels: Record<string, string> = {
  missing_sso_params: "Missing SSO parameters from Moodle.",
  expired_sso_token: "Your login token expired. Please try again.",
  invalid_sso_signature: "Invalid SSO signature from Moodle.",
  profile_sync_failed: "Could not sync your marketplace profile.",
  missing_service_role_key: "Marketplace server is missing SUPABASE_SERVICE_ROLE_KEY.",
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getMarketplaceSession();
  const cmsSignInPage = await getCmsPageBySlug("sign-in");
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
  const nextPath =
    searchParams?.next && searchParams.next.startsWith("/") ? searchParams.next : "/role-select";
  const errorText = searchParams?.error ? errorLabels[searchParams.error] : null;
  const moodleStartUrl = `/api/auth/moodle/start?next=${encodeURIComponent(nextPath)}`;

  return (
    <main>
      {cmsSignInPage?.components?.length ? (
        <CmsPageRenderer components={cmsSignInPage.components} renderContext={renderContext} />
      ) : null}

      <section className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h1 className="h3 mb-2">Sign in to Tutor Marketplace</h1>
                <p className="text-secondary mb-4">
                  Use your Moodle account to securely access your marketplace roles.
                </p>

                {errorText && (
                  <div className="alert alert-danger" role="alert">
                    {errorText}
                  </div>
                )}

                <a className="btn btn-primary w-100" href={moodleStartUrl}>
                  Sign in with Moodle
                </a>

                <div className="mt-3 small text-secondary">
                  Looking for tutors first? <Link href="/tutors">Browse tutors</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
