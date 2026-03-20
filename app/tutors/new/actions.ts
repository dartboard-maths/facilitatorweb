"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { getMarketplaceSession } from "../../../lib/auth/session";
import { createAdminClient } from "../../../lib/supabase/admin";

export type TutorProfileFormState = {
  error?: string;
  success?: string;
  photoUrl?: string | null;
};

const TUTOR_PHOTO_BUCKET = process.env.SUPABASE_TUTOR_PHOTO_BUCKET ?? "tutor-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseMultiSelect(formData: FormData, field: string): string[] {
  return formData
    .getAll(field)
    .map((item) => String(item).trim())
    .filter(Boolean);
}

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

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim().toLowerCase();
  const replaced = trimmed.replace(/[^a-z0-9.\-_]+/g, "-");
  return replaced || "photo";
}

async function uploadTutorPhoto(input: {
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
  photoFile: File;
}): Promise<string> {
  const { supabase, userId, photoFile } = input;

  if (!ALLOWED_PHOTO_TYPES.has(photoFile.type)) {
    throw new Error("Photo must be JPG, PNG, or WebP.");
  }

  if (photoFile.size > MAX_PHOTO_BYTES) {
    throw new Error("Photo must be 5MB or smaller.");
  }

  const fileExt = sanitizeFileName(photoFile.name).split(".").pop() || "jpg";
  const photoPath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
  const photoBytes = Buffer.from(await photoFile.arrayBuffer());

  const uploadOnce = async () =>
    supabase.storage.from(TUTOR_PHOTO_BUCKET).upload(photoPath, photoBytes, {
      contentType: photoFile.type,
      upsert: true,
    });

  let { error: uploadError } = await uploadOnce();

  if (uploadError && /bucket not found/i.test(uploadError.message)) {
    const { error: createBucketError } = await supabase.storage.createBucket(TUTOR_PHOTO_BUCKET, {
      public: true,
      fileSizeLimit: `${MAX_PHOTO_BYTES}`,
      allowedMimeTypes: Array.from(ALLOWED_PHOTO_TYPES),
    });

    if (
      createBucketError &&
      !/already exists/i.test(createBucketError.message)
    ) {
      throw new Error(
        `Photo upload failed: storage bucket '${TUTOR_PHOTO_BUCKET}' is missing and could not be created (${createBucketError.message}).`,
      );
    }

    ({ error: uploadError } = await uploadOnce());
  }

  if (uploadError) {
    throw new Error(`Photo upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(TUTOR_PHOTO_BUCKET).getPublicUrl(photoPath);
  return data.publicUrl;
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

  const fallbackNameParts = splitNameParts(session.name ?? null);
  const firstName = (session.firstName ?? fallbackNameParts.firstName).trim();
  const lastName = (session.lastName ?? fallbackNameParts.lastName).trim();
  const name = (session.name ?? `${firstName} ${lastName}`.trim()).trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const subjects = parseMultiSelect(formData, "subjects");
  const levels = parseMultiSelect(formData, "levels");
  const hourlyRateRaw = Number(formData.get("hourly_rate"));
  const travelRadiusRaw = Number(formData.get("travel_radius_km"));
  const latitudeRaw = Number(formData.get("latitude"));
  const longitudeRaw = Number(formData.get("longitude"));
  const photoFile = formData.get("photo");
  const moodlePhotoUrl = (session.moodlePhotoUrl ?? "").trim();
  let resolvedPhotoUrl: string | null = moodlePhotoUrl || null;

  if (!bio) {
    return { error: "Bio is required." };
  }

  if (subjects.length === 0) {
    return { error: "Select at least one subject." };
  }

  if (levels.length === 0) {
    return { error: "Select at least one level." };
  }

  if (!name || !firstName || !lastName) {
    return { error: "Your Moodle profile is missing required name fields. Please contact support." };
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
    full_name: name,
    first_name: firstName,
    last_name: lastName,
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

  if (photoFile instanceof File && photoFile.size > 0) {
    try {
      const photoUrl = await uploadTutorPhoto({
        supabase,
        userId: session.sub,
        photoFile,
      });
      resolvedPhotoUrl = photoUrl;

      const { error: photoSaveError } = await supabase
        .from("tutors")
        .update({ photo_url: photoUrl })
        .eq("user_id", session.sub);

      if (photoSaveError) {
        return { error: photoSaveError.message };
      }
    } catch (uploadError) {
      return {
        error:
          uploadError instanceof Error
            ? uploadError.message
            : "Photo upload failed.",
      };
    }
  } else if (moodlePhotoUrl) {
    const { error: photoSaveError } = await supabase
      .from("tutors")
      .update({ photo_url: moodlePhotoUrl })
      .eq("user_id", session.sub);

    if (photoSaveError) {
      return { error: photoSaveError.message };
    }
  }

  revalidatePath("/tutors");
  return { success: "Tutor profile saved successfully.", photoUrl: resolvedPhotoUrl };
}
