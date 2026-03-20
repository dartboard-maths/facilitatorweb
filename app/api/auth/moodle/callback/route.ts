import { NextRequest, NextResponse } from "next/server";
import {
  isTimestampValid,
  sanitizeNextPath,
  verifyMoodleSsoSignature,
} from "../../../../../lib/auth/moodle-sso";
import { setMarketplaceSession, deterministicUuidFromMoodleId } from "../../../../../lib/auth/session";
import { createAdminClient } from "../../../../../lib/supabase/admin";

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

  const { error: userUpsertError } = await admin.from("users").upsert({
    id: userId,
    email,
    full_name: preferredName,
    first_name: firstName || null,
    last_name: lastName || null,
    moodle_user_id: moodleUserId,
  });

  if (userUpsertError) {
    return NextResponse.redirect(new URL("/sign-in?error=profile_sync_failed", request.nextUrl.origin));
  }

  await setMarketplaceSession({
    email,
    moodleUserId,
    name: preferredName,
    firstName: firstName || null,
    lastName: lastName || null,
    moodlePhotoUrl,
  });

  return NextResponse.redirect(new URL(nextPath, request.nextUrl.origin));
}
