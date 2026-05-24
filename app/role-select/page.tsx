import Link from "next/link";
import { redirect } from "next/navigation";
import { getMarketplaceSession } from "../../lib/auth/session";
import { getCmsPageBySlug } from "../../lib/cms/contentful";
import { CmsPageRenderer } from "../../components/cms/CmsPageRenderer";

export default async function RoleSelectPage() {
  const session = await getMarketplaceSession();
  if (!session) {
    redirect("/sign-in?next=/role-select");
  }

  const cmsRoleSelectPage = await getCmsPageBySlug("role-select");
  const renderContext = {
    contextualLinks: {
      "#sign-in": {
        href: "/role-select",
        label: "View Profile",
      },
    },
  };

  const hasSchoolAdminAccess = session.isSchoolAdmin;

  return (
    <>
      <main>
        {cmsRoleSelectPage?.components?.length ? (
          <CmsPageRenderer components={cmsRoleSelectPage.components} renderContext={renderContext} />
        ) : null}

        <section className="container py-5">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-10">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
                <Link href="/bookings" className="btn btn-outline-secondary btn-sm">
                  Bookings
                </Link>
                <div className="ms-auto d-flex align-items-center gap-2">
                  <Link href="/role-select" className="btn btn-outline-secondary btn-sm">
                    Choose role
                  </Link>
                  <form action="/api/auth/sign-out" method="post">
                    <button type="submit" className="btn btn-outline-secondary btn-sm">
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
              <h1 className="h3 mb-2">Choose your marketplace role</h1>
              <p className="text-secondary mb-4">
                {hasSchoolAdminAccess
                  ? "Select the role you want to use right now."
                  : "Your account currently has Tutor access only."}
              </p>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="card h-100 shadow-sm">
                    <div className="card-body d-flex flex-column">
                      <h2 className="h5 mb-2">Tutor</h2>
                      <p className="text-secondary mb-3">
                        Create or update your tutor profile, availability, rates, and location.
                      </p>
                      <div className="d-grid gap-2 mt-auto">
                        <Link
                          href="/api/auth/view-role?role=tutor&next=%2Ftutors%2Fnew"
                          className="btn btn-primary"
                        >
                          Edit tutor profile
                        </Link>
                        <Link
                          href="/api/auth/view-role?role=tutor&next=%2Fbookings"
                          className="btn btn-outline-primary"
                        >
                          View booking requests
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {hasSchoolAdminAccess && (
                  <div className="col-12 col-md-6">
                    <div className="card h-100 shadow-sm">
                      <div className="card-body d-flex flex-column">
                        <h2 className="h5 mb-2">School Admin</h2>
                        <p className="text-secondary mb-3">
                          Browse tutors as a school admin and create bookings for your managed schools.
                        </p>
                        <div className="d-grid gap-2 mt-auto">
                          <Link
                            href="/api/auth/view-role?role=school_admin&next=%2Ftutors"
                            className="btn btn-outline-primary"
                          >
                            Open school admin tools
                          </Link>
                          <Link
                            href="/api/auth/view-role?role=school_admin&next=%2Fbookings"
                            className="btn btn-outline-secondary"
                          >
                            Booking inbox
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
