"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { getMarketplaceSession } from "../../../lib/auth/session";
import { LEVEL_OPTIONS, SUBJECT_OPTIONS } from "../../../lib/tutor/subject-level-options";
import { createAdminClient } from "../../../lib/supabase/admin";

export type TutorProfileFormState = {
  error?: string;
  success?: string;
  photoUrl?: string | null;
};

const TUTOR_PHOTO_BUCKET = process.env.SUPABASE_TUTOR_PHOTO_BUCKET ?? "tutor-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const WEEKDAY_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

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

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

function parseAvailability(formData: FormData): {
  timezone: string;
  rules: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
    recurrenceStartDate: string;
    recurrenceEndDate: string;
  }>;
  blockedDates: string[];
  error?: string;
} {
  const timezone = String(formData.get("availability_timezone") ?? "UTC").trim() || "UTC";
  const rules: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
    recurrenceStartDate: string;
    recurrenceEndDate: string;
  }> = [];

  for (const weekday of WEEKDAY_VALUES) {
    const enabled = formData.get(`availability_day_${weekday}_enabled`) === "on";
    if (!enabled) {
      continue;
    }

    const startTime = String(formData.get(`availability_day_${weekday}_start`) ?? "").trim();
    const endTime = String(formData.get(`availability_day_${weekday}_end`) ?? "").trim();
    const recurrenceStartDate = String(
      formData.get(`availability_day_${weekday}_start_date`) ?? "",
    ).trim();
    const recurrenceEndDate = String(
      formData.get(`availability_day_${weekday}_end_date`) ?? "",
    ).trim();
    if (!startTime || !endTime) {
      return {
        timezone,
        rules,
        blockedDates: [],
        error: "Each selected availability day must include start and end time.",
      };
    }
    if (!isValidDateString(recurrenceStartDate)) {
      return {
        timezone,
        rules,
        blockedDates: [],
        error: "Each selected day must include a valid start date (YYYY-MM-DD).",
      };
    }
    if (!isValidDateString(recurrenceEndDate)) {
      return {
        timezone,
        rules,
        blockedDates: [],
        error: "Each selected day must include a valid end date (YYYY-MM-DD).",
      };
    }
    if (recurrenceEndDate < recurrenceStartDate) {
      return {
        timezone,
        rules,
        blockedDates: [],
        error: "For each selected day, end date must be the same day or after start date.",
      };
    }
    if (endTime <= startTime) {
      return {
        timezone,
        rules,
        blockedDates: [],
        error: "Availability end time must be after start time.",
      };
    }

    rules.push({ weekday, startTime, endTime, recurrenceStartDate, recurrenceEndDate });
  }

  if (rules.length === 0) {
    return {
      timezone,
      rules,
      blockedDates: [],
      error: "Select at least one available day and time.",
    };
  }

  const blockedDatesRaw = String(formData.get("blocked_dates") ?? "");
  const blockedDates = blockedDatesRaw
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);

  const invalidDate = blockedDates.find((value) => !isValidDateString(value));
  if (invalidDate) {
    return {
      timezone,
      rules,
      blockedDates: [],
      error: `Invalid blocked date '${invalidDate}'. Use YYYY-MM-DD format.`,
    };
  }

  return { timezone, rules, blockedDates };
}

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim().toLowerCase();
  const replaced = trimmed.replace(/[^a-z0-9.\-_]+/g, "-");
  return replaced || "photo";
}

function isMissingAvailabilitySchemaError(error: { message?: string } | null): boolean {
  const message = error?.message ?? "";
  return (
    /could not find the table\s+'public\.tutor_availability_rules'\s+in the schema cache/i.test(
      message,
    ) ||
    /could not find the table\s+'public\.tutor_availability_overrides'\s+in the schema cache/i.test(
      message,
    ) ||
    /relation\s+"public\.tutor_availability_rules"\s+does not exist/i.test(message) ||
    /relation\s+"public\.tutor_availability_overrides"\s+does not exist/i.test(message)
  );
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
  const allowedSubjects = new Set<string>(SUBJECT_OPTIONS);
  const allowedLevels = new Set<string>(LEVEL_OPTIONS);
  if (subjects.some((s) => !allowedSubjects.has(s))) {
    return { error: "Invalid subject selection." };
  }
  if (levels.some((l) => !allowedLevels.has(l))) {
    return { error: "Invalid level selection." };
  }
  const hourlyRateRaw = Number(formData.get("hourly_rate"));
  const travelRadiusRaw = Number(formData.get("travel_radius_km"));
  const latitudeRaw = Number(formData.get("latitude"));
  const longitudeRaw = Number(formData.get("longitude"));
  const photoFile = formData.get("photo");
  const moodlePhotoUrl = (session.moodlePhotoUrl ?? "").trim();
  const availability = parseAvailability(formData);
  let resolvedPhotoUrl: string | null = moodlePhotoUrl || null;
  let availabilityWarning: string | null = null;

  if (availability.error) {
    return { error: availability.error };
  }

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

  const { error: deleteRulesError } = await supabase
    .from("tutor_availability_rules")
    .delete()
    .eq("tutor_user_id", session.sub);
  if (deleteRulesError) {
    if (isMissingAvailabilitySchemaError(deleteRulesError)) {
      availabilityWarning =
        "Profile saved, but availability tables are not migrated yet. Apply migrations 009 and 012.";
    } else {
      return { error: deleteRulesError.message };
    }
  }

  if (!availabilityWarning) {
    const nextRules = availability.rules.map((rule) => ({
      tutor_user_id: session.sub,
      weekday: rule.weekday,
      start_time: rule.startTime,
      end_time: rule.endTime,
      timezone: availability.timezone,
      recurrence_start_date: rule.recurrenceStartDate,
      recurrence_end_date: rule.recurrenceEndDate,
      is_active: true,
    }));
    let { error: insertRulesError } = await supabase
      .from("tutor_availability_rules")
      .insert(nextRules);

    if (
      insertRulesError &&
      (/recurrence_start_date/i.test(insertRulesError.message) ||
        /recurrence_end_date/i.test(insertRulesError.message))
    ) {
      const legacyRules = availability.rules.map((rule) => ({
        tutor_user_id: session.sub,
        weekday: rule.weekday,
        start_time: rule.startTime,
        end_time: rule.endTime,
        timezone: availability.timezone,
        is_active: true,
      }));
      const { error: legacyInsertError } = await supabase
        .from("tutor_availability_rules")
        .insert(legacyRules);
      insertRulesError = legacyInsertError ?? null;
    }

    if (insertRulesError) {
      if (isMissingAvailabilitySchemaError(insertRulesError)) {
        availabilityWarning =
          "Profile saved, but availability tables are not migrated yet. Apply migrations 009 and 012.";
      } else {
        return { error: insertRulesError.message };
      }
    }

    const { error: deleteOverridesError } = await supabase
      .from("tutor_availability_overrides")
      .delete()
      .eq("tutor_user_id", session.sub)
      .eq("is_available", false);
    if (deleteOverridesError) {
      if (isMissingAvailabilitySchemaError(deleteOverridesError)) {
        availabilityWarning =
          "Profile saved, but availability tables are not migrated yet. Apply migrations 009 and 012.";
      } else {
        return { error: deleteOverridesError.message };
      }
    }

    if (!availabilityWarning && availability.blockedDates.length > 0) {
      const nextOverrides = availability.blockedDates.map((blockedDate) => ({
        tutor_user_id: session.sub,
        override_date: blockedDate,
        is_available: false,
        reason: "Tutor unavailable",
      }));

      const { error: insertOverridesError } = await supabase
        .from("tutor_availability_overrides")
        .insert(nextOverrides);
      if (insertOverridesError) {
        if (isMissingAvailabilitySchemaError(insertOverridesError)) {
          availabilityWarning =
            "Profile saved, but availability tables are not migrated yet. Apply migrations 009 and 012.";
        } else {
          return { error: insertOverridesError.message };
        }
      }
    }
  }

  revalidatePath("/tutors");
  return {
    success: availabilityWarning ?? "Tutor profile saved successfully.",
    photoUrl: resolvedPhotoUrl,
  };
}
