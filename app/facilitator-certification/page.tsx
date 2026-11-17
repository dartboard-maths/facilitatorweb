import Link from "next/link";
import { redirect } from "next/navigation";
import { getMoodleFacilitatorCourseUrl, hasTutorMarketplaceAccess } from "../../lib/auth/facilitator-access";
import { getMarketplaceSession } from "../../lib/auth/session";

export default async function FacilitatorCertificationPage() {
  const session = await getMarketplaceSession();
  if (!session) {
    redirect("/sign-in?next=/facilitator-certification");
  }

  if (hasTutorMarketplaceAccess(session)) {
    redirect("/tutors/new");
  }

  const courseUrl = getMoodleFacilitatorCourseUrl();
  const moodleSignInUrl = `/api/auth/moodle/start?next=${encodeURIComponent("/tutors/new")}`;

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h1 className="h3 mb-2">Facilitator certification required</h1>
              <p className="text-secondary mb-4">
                Tutor marketplace access is available after you complete the Facilitator Training course
                (DBMU01) in Moodle. You must pass the certification quizzes and complete all course activities.
              </p>

              <div className="d-grid gap-2 d-md-flex">
                {courseUrl ? (
                  <a className="btn btn-primary" href={courseUrl} target="_blank" rel="noopener noreferrer">
                    Open Facilitator Training in Moodle
                  </a>
                ) : null}
                <a className="btn btn-outline-primary" href={moodleSignInUrl}>
                  Re-check certification status
                </a>
              </div>

              <p className="small text-secondary mt-4 mb-0">
                Already certified? Sign in again via Moodle so we can refresh your certification status.
                School admin tools are still available from{" "}
                <Link href="/role-select">role selection</Link> when your account has that access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
