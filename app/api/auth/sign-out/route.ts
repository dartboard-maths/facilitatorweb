import { NextRequest, NextResponse } from "next/server";
import { clearMarketplaceSession } from "../../../../lib/auth/session";

export async function POST(request: NextRequest) {
  await clearMarketplaceSession();

  const redirectTo = new URL("/sign-in", request.nextUrl.origin);
  return NextResponse.redirect(redirectTo);
}
