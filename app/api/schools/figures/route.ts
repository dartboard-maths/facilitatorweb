import { NextRequest, NextResponse } from "next/server";
import { getMarketplaceSession } from "../../../../lib/auth/session";
import { fetchInspectorSchoolFigures } from "../../../../lib/schools/inspector-directory";

export async function GET(request: NextRequest) {
  const session = await getMarketplaceSession();
  if (!session) {
    return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  }
  const school = request.nextUrl.searchParams.get("school") ?? "";
  const result = await fetchInspectorSchoolFigures(session.moodleUserId, school);
  if (!result.figures) {
    const status = result.status === 403 || result.status === 404 ? result.status : 503;
    return NextResponse.json({ error: "figures_unavailable" }, { status });
  }
  return NextResponse.json(result.figures);
}
