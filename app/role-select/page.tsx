import Link from "next/link";
import { redirect } from "next/navigation";
import { getMoodleFacilitatorCourseUrl, hasTutorMarketplaceAccess } from "../../lib/auth/facilitator-access";
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
  const hasTutorAccess = hasTutorMarketplaceAccess(session);
  const facilitatorCourseUrl = getMoodleFacilitatorCourseUrl();

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
                {hasSchoolAdminAccess && hasTutorAccess
                  ? "Select the role you want to use right now."
                  : hasSchoolAdminAccess
                    ? "Your account has School Admin access. Tutor tools unlock after Facilitator Training (DBMU01) is complete."
                    : hasTutorAccess
                      ? "Your account currently has Tutor access only."
                      : "Complete Facilitator Training (DBMU01) in Moodle to unlock tutor marketplace tools."}
              </p>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="card h-100 shadow-sm">
                    <div className="card-body d-flex flex-column">
                      <h2 className="h5 mb-2">Tutor</h2>
                      <p className="text-secondary mb-3">
                        {hasTutorAccess
                          ? "Create or update your tutor profile, availability, rates, and location."
                          : "Certified facilitators can list availability and accept booking requests."}
                      </p>
                      <div className="d-grid gap-2 mt-auto">
                        {hasTutorAccess ? (
                          <>
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
                          </>
                        ) : (
                          <>
                            <Link href="/facilitator-certification" className="btn btn-primary">
                              View certification requirements
                            </Link>
                            {facilitatorCourseUrl ? (
                              <a
                                className="btn btn-outline-primary"
                                href={facilitatorCourseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open Facilitator Training
                              </a>
                            ) : null}
                          </>
                        )}
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
