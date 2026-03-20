"use server";

import { revalidatePath } from "next/cache";
import { getMarketplaceSession } from "../../../lib/auth/session";
import { createAdminClient } from "../../../lib/supabase/admin";

export type TutorProfileFormState = {
  error?: string;
  success?: string;
};

function parseCsv(value: FormDataEntryValue | null): string[] {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createTutorProfile(
  _prevState: TutorProfileFormState,
  formData: FormData,
): Promise<TutorProfileFormState> {
  const session = await getMarketplaceSession();

  if (!session) {
    return { error: "You must be signed in with Moodle to create a tutor profile." };
  }

  const supabase = createAdminClient();

  const name = String(formData.get("name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const subjects = parseCsv(formData.get("subjects"));
  const levels = parseCsv(formData.get("levels"));
  const hourlyRateRaw = Number(formData.get("hourly_rate"));
  const travelRadiusRaw = Number(formData.get("travel_radius_km"));
  const latitudeRaw = Number(formData.get("latitude"));
  const longitudeRaw = Number(formData.get("longitude"));

  if (!name || !bio) {
    return { error: "Name and bio are required." };
  }

  if (!Number.isFinite(hourlyRateRaw) || hourlyRateRaw < 0) {
    return { error: "Hourly rate must be a valid non-negative number." };
  }

  if (!Number.isFinite(travelRadiusRaw) || travelRadiusRaw < 0) {
    return { error: "Travel radius must be a valid non-negative number." };
  }

  if (
    !Number.isFinite(latitudeRaw) ||
    !Number.isFinite(longitudeRaw) ||
    latitudeRaw < -90 ||
    latitudeRaw > 90 ||
    longitudeRaw < -180 ||
    longitudeRaw > 180
  ) {
    return { error: "Please select a valid location on the map." };
  }

  const { error: userUpsertError } = await supabase.from("users").upsert({
    id: session.sub,
    email: session.email,
    full_name: session.name,
    moodle_user_id: session.moodleUserId,
  });

  if (userUpsertError) {
    return { error: userUpsertError.message };
  }

  const { error } = await supabase.rpc("create_tutor_profile", {
    p_user_id: session.sub,
    p_name: name,
    p_bio: bio,
    p_subjects: subjects,
    p_levels: levels,
    p_hourly_rate: hourlyRateRaw,
    p_latitude: latitudeRaw,
    p_longitude: longitudeRaw,
    p_travel_radius_km: travelRadiusRaw,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tutors");
  return { success: "Tutor profile saved successfully." };
}
