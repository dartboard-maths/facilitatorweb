import { NextRequest, NextResponse } from "next/server";
import { getMarketplaceSession } from "../../../../lib/auth/session";
import { fetchInspectorGradeProfile } from "../../../../lib/schools/inspector-directory";

export async function GET(request: NextRequest) {
  const session = await getMarketplaceSession();
  if (!session) {
    return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  }
  const school = request.nextUrl.searchParams.get("school") ?? "";
  const grade = Number(request.nextUrl.searchParams.get("grade"));
  const result = await fetchInspectorGradeProfile(session.moodleUserId, school, grade);
  if (!result.profile) {
    const status = result.status === 403 || result.status === 404 ? result.status : 503;
    return NextResponse.json({ error: "grade_unavailable" }, { status });
  }
  return NextResponse.json(result.profile);
}
