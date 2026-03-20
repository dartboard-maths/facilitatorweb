import { createTutorProfile } from "./actions";
import { TutorProfileForm } from "../../../components/tutor/TutorProfileForm";
import { getMarketplaceSession } from "../../../lib/auth/session";
import { createAdminClient } from "../../../lib/supabase/admin";
import { redirect } from "next/navigation";

function splitNameParts(fullName: string | null): { firstName: string; lastName: string } {
  const normalized = (fullName ?? "").trim();
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0] ?? "", lastName: "" };
  }

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export default async function NewTutorProfilePage() {
  const session = await getMarketplaceSession();
  if (!session) {
    redirect("/sign-in?next=/tutors/new");
  }

  const supabase = createAdminClient();
  const { data: existingTutorRows } = await supabase.rpc("get_tutor_profile_for_edit", {
    p_user_id: session.sub,
  });
  const existingTutor = existingTutorRows?.[0] ?? null;
  const initialPhotoUrl = existingTutor?.photo_url ?? session.moodlePhotoUrl ?? null;

  const fallbackNameParts = splitNameParts(session.name ?? null);
  const resolvedFirstName = session.firstName ?? fallbackNameParts.firstName;
  const resolvedLastName = session.lastName ?? fallbackNameParts.lastName;

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-10 col-xl-9">
          <TutorProfileForm
            action={createTutorProfile}
            initialName={session.name ?? ""}
            initialFirstName={resolvedFirstName}
            initialLastName={resolvedLastName}
            hasMoodlePhoto={Boolean(session.moodlePhotoUrl)}
            moodlePhotoUrl={session.moodlePhotoUrl ?? null}
            initialPhotoUrl={initialPhotoUrl}
            initialBio={existingTutor?.bio ?? ""}
            initialSubjects={existingTutor?.subjects ?? []}
            initialLevels={existingTutor?.levels ?? []}
            initialHourlyRate={existingTutor?.hourly_rate ?? null}
            initialTravelRadiusKm={existingTutor?.travel_radius_km ?? null}
            initialLatitude={existingTutor?.latitude ?? null}
            initialLongitude={existingTutor?.longitude ?? null}
          />
        </div>
      </div>
    </main>
  );
}
