import { createTutorProfile } from "./actions";
import { TutorProfileForm } from "../../../components/tutor/TutorProfileForm";

export default function NewTutorProfilePage() {
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
