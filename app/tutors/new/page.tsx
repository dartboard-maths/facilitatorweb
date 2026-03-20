import { createTutorProfile } from "./actions";
import { TutorProfileForm } from "../../../components/tutor/TutorProfileForm";
import { getMarketplaceSession } from "../../../lib/auth/session";
import { redirect } from "next/navigation";

export default async function NewTutorProfilePage() {
  const session = await getMarketplaceSession();
  if (!session) {
    redirect("/sign-in?next=/tutors/new");
  }

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-10 col-xl-9">
          <h1 className="mb-3">Create Tutor Profile</h1>
          <p className="text-secondary mb-4">
            Add your teaching profile, set your rates, and pin your map location.
          </p>
          <TutorProfileForm action={createTutorProfile} />
        </div>
      </div>
    </main>
  );
}
