import { NextRequest, NextResponse } from "next/server";
import { getMarketplaceSession } from "../../../../lib/auth/session";
import { MARKETPLACE_VIEW_ROLE_COOKIE, parseMarketplaceViewRole } from "../../../../lib/auth/view-role";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/bookings";
  }
  return next;
}

function shouldUseSecureCookies(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function GET(request: NextRequest) {
  const session = await getMarketplaceSession();
  if (!session) {
    const signIn = new URL("/sign-in", request.nextUrl.origin);
    signIn.searchParams.set("next", safeNextPath(request.nextUrl.searchParams.get("next")));
    return NextResponse.redirect(signIn);
  }

  const roleParam = request.nextUrl.searchParams.get("role");
  const parsed = parseMarketplaceViewRole(roleParam ?? undefined);
  if (!parsed) {
    return NextResponse.redirect(
      new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.nextUrl.origin),
    );
  }

  if (parsed === "school_admin" && !session.isSchoolAdmin) {
    return NextResponse.redirect(new URL("/role-select", request.nextUrl.origin));
  }

  const destination = new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.nextUrl.origin);
  const response = NextResponse.redirect(destination);

  response.cookies.set(MARKETPLACE_VIEW_ROLE_COOKIE, parsed, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  return response;
}
