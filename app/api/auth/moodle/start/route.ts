import { NextRequest, NextResponse } from "next/server";
import { getMoodleSsoEntryUrl, sanitizeNextPath } from "../../../../../lib/auth/moodle-sso";

export async function GET(request: NextRequest) {
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const callbackUrl = new URL("/api/auth/moodle/callback", request.nextUrl.origin);
  callbackUrl.searchParams.set("next", nextPath);

  const moodleSsoUrl = new URL(getMoodleSsoEntryUrl());
  moodleSsoUrl.searchParams.set("redirect", callbackUrl.toString());
  moodleSsoUrl.searchParams.set("next", nextPath);

  return NextResponse.redirect(moodleSsoUrl);
}
