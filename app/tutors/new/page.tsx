import { createTutorProfile } from "./actions";
import { TutorProfileForm } from "../../../components/tutor/TutorProfileForm";
import { getMarketplaceSession } from "../../../lib/auth/session";
import { createAdminClient } from "../../../lib/supabase/admin";
import Link from "next/link";
import { redirect } from "next/navigation";

type AvailabilityRuleRow = {
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
  recurrence_start_date: string | null;
  recurrence_end_date: string | null;
  blocked_dates: string;
};

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

  const { data: availabilityRows } = await supabase.rpc("get_tutor_availability_for_edit", {
    p_user_id: session.sub,
  });
  const availability = (availabilityRows ?? []) as AvailabilityRuleRow[];
  const initialWeeklyAvailability = availability.map((row) => ({
    weekday: row.weekday,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    recurrenceStartDate: row.recurrence_start_date ?? undefined,
    recurrenceEndDate: row.recurrence_end_date ?? undefined,
  }));
  const initialAvailabilityTimezone = availability[0]?.timezone ?? "UTC";
  const initialBlockedDates = availability[0]?.blocked_dates ?? "";
  const initialPhotoUrl = existingTutor?.photo_url ?? session.moodlePhotoUrl ?? null;

  const fallbackNameParts = splitNameParts(session.name ?? null);
  const resolvedFirstName = session.firstName ?? fallbackNameParts.firstName;
  const resolvedLastName = session.lastName ?? fallbackNameParts.lastName;

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-10 col-xl-9">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
            <Link href="/" className="btn btn-link px-0">
              Home
            </Link>
            <Link href="/tutors" className="btn btn-link px-0">
              Tutors
            </Link>
            <Link href="/bookings" className="btn btn-link px-0">
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
            initialWeeklyAvailability={initialWeeklyAvailability}
            initialAvailabilityTimezone={initialAvailabilityTimezone}
            initialBlockedDates={initialBlockedDates}
          />
        </div>
      </div>
    </main>
  );
}
