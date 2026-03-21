import Link from "next/link";
import { redirect } from "next/navigation";
import { getMarketplaceSession } from "../../lib/auth/session";

export default async function RoleSelectPage() {
  const session = await getMarketplaceSession();
  if (!session) {
    redirect("/sign-in?next=/role-select");
  }
  const hasSchoolAdminAccess = session.isSchoolAdmin;

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-10">
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
                  <Link href="/tutors/new" className="btn btn-primary mt-auto">
                    Edit tutor profile
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="card h-100 shadow-sm">
                <div className="card-body d-flex flex-column">
                  <h2 className="h5 mb-2">School Admin</h2>
                  <p className="text-secondary mb-3">
                    Browse tutors as a school admin and create bookings for your managed schools.
                  </p>
                  {hasSchoolAdminAccess ? (
                    <Link href="/tutors" className="btn btn-outline-primary mt-auto">
                      Open school admin tools
                    </Link>
                  ) : (
                    <button type="button" className="btn btn-outline-secondary mt-auto" disabled>
                      School admin access required
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <form action="/api/auth/sign-out" method="post">
              <button type="submit" className="btn btn-link ps-0">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
