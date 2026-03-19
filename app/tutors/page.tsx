import { TutorMap } from "../../components/tutor/TutorMap";

export default function TutorsSearchPage() {
  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <h1 className="mb-3">Find Tutors by Location</h1>
          <p className="text-secondary mb-4">
            Your location is used to search tutors by radius and sort by distance.
          </p>
          <TutorMap initialRadiusKm={20} />
        </div>
      </div>
    </main>
  );
}
