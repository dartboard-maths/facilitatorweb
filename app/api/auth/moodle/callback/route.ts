import { NextRequest, NextResponse } from "next/server";
import {
  isTimestampValid,
  sanitizeNextPath,
  verifyMoodleSsoSignature,
} from "../../../../../lib/auth/moodle-sso";
import { setMarketplaceSession, deterministicUuidFromMoodleId } from "../../../../../lib/auth/session";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { parseMoodleSchoolProfilesParam } from "../../../../../lib/schools/moodle-school-profiles";

function splitNameParts(fullName: string | null): { firstName: string | null; lastName: string | null } {
  const normalized = (fullName ?? "").trim();
  if (!normalized) {
    return { firstName: null, lastName: null };
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(" ") || null,
  };
}

function sanitizePhotoUrl(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function sanitizeSchoolIdsCsv(value: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => /^[A-Z0-9_-]+$/.test(item));
}

export async function GET(request: NextRequest) {
  const email = (request.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  const moodleUserId = (request.nextUrl.searchParams.get("moodle_user_id") ?? "").trim();
  const moodleFirstName = (
    request.nextUrl.searchParams.get("firstname") ??
    request.nextUrl.searchParams.get("first_name") ??
    ""
  ).trim();
  const moodleLastName = (
    request.nextUrl.searchParams.get("lastname") ??
    request.nextUrl.searchParams.get("last_name") ??
    ""
  ).trim();
  const moodleUsername = (request.nextUrl.searchParams.get("username") ?? "").trim();
  const moodlePhotoUrl = sanitizePhotoUrl(request.nextUrl.searchParams.get("photo_url") ?? "");
  const isSchoolAdmin = (request.nextUrl.searchParams.get("dbm_is_school_admin") ?? "0").trim() === "1";
  const managedSchoolIds = sanitizeSchoolIdsCsv(
    request.nextUrl.searchParams.get("dbm_school_ids") ?? "",
  );
  const managedSchoolIdsCsv = managedSchoolIds.join(",");
  const signature = (request.nextUrl.searchParams.get("sig") ?? "").trim();
  const timestamp = Number(request.nextUrl.searchParams.get("ts") ?? "0");
  const name = (request.nextUrl.searchParams.get("name") ?? "").trim() || null;
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const fallbackNameFromParts = [moodleFirstName, moodleLastName].filter(Boolean).join(" ").trim();
  const preferredName = (name ?? fallbackNameFromParts ?? moodleUsername ?? "").trim() || null;
  const derivedNameParts = splitNameParts(preferredName);
  const firstName = moodleFirstName || derivedNameParts.firstName;
  const lastName = moodleLastName || derivedNameParts.lastName;

  if (!email || !moodleUserId || !signature) {
    return NextResponse.redirect(new URL("/sign-in?error=missing_sso_params", request.nextUrl.origin));
  }

  if (!isTimestampValid(timestamp)) {
    return NextResponse.redirect(new URL("/sign-in?error=expired_sso_token", request.nextUrl.origin));
  }

  const isValidSignature = verifyMoodleSsoSignature({
    email,
    moodleUserId,
    timestamp,
    nextPath,
    isSchoolAdmin,
    managedSchoolIdsCsv,
    signature,
  });

  if (!isValidSignature) {
    return NextResponse.redirect(new URL("/sign-in?error=invalid_sso_signature", request.nextUrl.origin));
  }

  const userId = deterministicUuidFromMoodleId(moodleUserId);
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.redirect(new URL("/sign-in?error=missing_service_role_key", request.nextUrl.origin));
  }

  const primaryUserPayload = {
    id: userId,
    email,
    full_name: preferredName,
    first_name: firstName || null,
    last_name: lastName || null,
    is_school_admin: isSchoolAdmin,
    managed_school_ids: managedSchoolIds,
    moodle_user_id: moodleUserId,
  };

  let { error: userUpsertError } = await admin.from("users").upsert(primaryUserPayload);

  // Backward-compatible fallback for environments where school-admin columns
  // have not yet been migrated (is_school_admin / managed_school_ids).
  if (
    userUpsertError &&
    (
      /is_school_admin/i.test(userUpsertError.message) ||
      /managed_school_ids/i.test(userUpsertError.message)
    )
  ) {
    const { error: fallbackUpsertError } = await admin.from("users").upsert({
      id: userId,
      email,
      full_name: preferredName,
      first_name: firstName || null,
      last_name: lastName || null,
      moodle_user_id: moodleUserId,
    });
    userUpsertError = fallbackUpsertError ?? null;
  }

  if (userUpsertError) {
    return NextResponse.redirect(new URL("/sign-in?error=profile_sync_failed", request.nextUrl.origin));
  }

  const schoolProfiles = parseMoodleSchoolProfilesParam(
    request.nextUrl.searchParams.get("dbm_school_profiles_b64"),
  );
  if (schoolProfiles.length > 0) {
    const syncedAt = new Date().toISOString();
    const schoolRows = schoolProfiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      address_line1: profile.address_line1,
      address_line2: profile.address_line2,
      suburb: profile.suburb,
      city: profile.city,
      state: profile.state,
      postcode: profile.postcode,
      country: profile.country,
      latitude: profile.latitude,
      longitude: profile.longitude,
      synced_at: syncedAt,
    }));
    const { error: schoolsUpsertError } = await admin.from("schools").upsert(schoolRows, { onConflict: "id" });
    if (schoolsUpsertError) {
      // SSO still succeeds if migration 016 is not applied or sync is skipped.
      console.warn("schools sync:", schoolsUpsertError.message);
    }
  }

  await setMarketplaceSession({
    email,
    moodleUserId,
    name: preferredName,
    firstName: firstName || null,
    lastName: lastName || null,
    moodlePhotoUrl,
    isSchoolAdmin,
    managedSchoolIds,
  });

  return NextResponse.redirect(new URL(nextPath, request.nextUrl.origin));
}
