import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getPublicRatingSummariesForTutorUserIds } from "../../../../lib/reviews/get-tutor-public-stats";

/**
 * GET /api/tutors/ratings?userIds=uuid,uuid — public rating summaries for map/list (batch).
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("userIds") ?? "";
  const userIds = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (userIds.length === 0) {
    return NextResponse.json({});
  }

  if (userIds.length > 80) {
    return NextResponse.json({ error: "Too many ids" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const map = await getPublicRatingSummariesForTutorUserIds(supabase, userIds);

  const out: Record<string, { avgDisplay: number; count: number }> = {};
  for (const [uid, v] of map) {
    out[uid] = { avgDisplay: v.avgDisplay, count: v.count };
  }
  for (const id of userIds) {
    if (!(id in out)) {
      out[id] = { avgDisplay: 0, count: 0 };
    }
  }

  return NextResponse.json(out);
}
