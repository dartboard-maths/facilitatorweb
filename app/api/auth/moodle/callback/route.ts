import { NextRequest, NextResponse } from "next/server";
import {
  isTimestampValid,
  sanitizeNextPath,
  verifyMoodleSsoSignature,
} from "../../../../../lib/auth/moodle-sso";
import { setMarketplaceSession, deterministicUuidFromMoodleId } from "../../../../../lib/auth/session";
import { createAdminClient } from "../../../../../lib/supabase/admin";

export async function GET(request: NextRequest) {
  const email = (request.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  const moodleUserId = (request.nextUrl.searchParams.get("moodle_user_id") ?? "").trim();
  const signature = (request.nextUrl.searchParams.get("sig") ?? "").trim();
  const timestamp = Number(request.nextUrl.searchParams.get("ts") ?? "0");
  const name = (request.nextUrl.searchParams.get("name") ?? "").trim() || null;
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));

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
    full_name: name,
    moodle_user_id: moodleUserId,
  });

  if (userUpsertError) {
    return NextResponse.redirect(new URL("/sign-in?error=profile_sync_failed", request.nextUrl.origin));
  }

  await setMarketplaceSession({
    email,
    moodleUserId,
    name,
  });

  return NextResponse.redirect(new URL(nextPath, request.nextUrl.origin));
}
