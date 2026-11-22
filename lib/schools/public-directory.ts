import type { InspectorSchoolPin } from "./inspector-directory";
import { signedMoodleGet } from "./inspector-directory";

const PATH = "/local/wpsso/marketplace_snapshot.php";
const PAGE_LIMIT = "100";
const MAX_PAGES = 40;

export type PublicSchoolSummary = {
  learners: string;
  courses: string;
  completion: string;
};

export type PublicSchoolPin = InspectorSchoolPin & {
  figures: PublicSchoolSummary;
};

export type PublicDirectoryAccess = "ready" | "unavailable";

function schoolId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const id = value.trim().toUpperCase();
  return /^[A-Z0-9_-]+$/.test(id) ? id : null;
}

function coordinate(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    return null;
  }
  return number;
}

function countText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return null;
  }
  return String(Math.round(number));
}

function completionText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return null;
  }
  const percent = number <= 1 ? number * 100 : number;
  const rounded = Math.round(percent * 10) / 10;
  return `${rounded}%`;
}

export function publicPinFromRecord(value: unknown): PublicSchoolPin | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.active === false) {
    return null;
  }
  const id = schoolId(record.school_id);
  const name = typeof record.name === "string" ? record.name.replace(/\s+/g, " ").trim() : "";
  const location = record.location;
  if (!id || !name || !location || typeof location !== "object") {
    return null;
  }
  const place = location as Record<string, unknown>;
  const latitude = coordinate(place.latitude, -90, 90);
  const longitude = coordinate(place.longitude, -180, 180);
  if (latitude === null || longitude === null) {
    return null;
  }
  const learning = record.learning;
  const metrics = learning && typeof learning === "object" ? (learning as Record<string, unknown>) : {};
  const learners = countText(metrics.learners_total);
  const courses = countText(metrics.courses_total);
  const completion = completionText(metrics.completion_rate);
  if (learners === null && courses === null && completion === null) {
    return null;
  }
  return {
    id,
    name,
    latitude,
    longitude,
    figures: {
      learners: learners ?? "—",
      courses: courses ?? "—",
      completion: completion ?? "—",
    },
  };
}

export async function fetchPublicSchools(): Promise<{
  access: PublicDirectoryAccess;
  schools: PublicSchoolPin[];
}> {
  const schools: PublicSchoolPin[] = [];
  const seen = new Set<string>();
  let cursor = "";

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params: Record<string, string> = { v: "1", limit: PAGE_LIMIT };
    if (cursor) {
      params.cursor = cursor;
    }
    let response: Response | null;
    try {
      response = await signedMoodleGet(PATH, params);
    } catch (error) {
      console.error("Public school list failed", error);
      return { access: "unavailable", schools: [] };
    }
    if (!response) {
      console.error("Public school list is not configured");
      return { access: "unavailable", schools: [] };
    }
    if (!response.ok) {
      return { access: "unavailable", schools: [] };
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { access: "unavailable", schools: [] };
    }
    const record = body as { schools?: unknown; cursor?: unknown };
    if (!Array.isArray(record.schools)) {
      return { access: "unavailable", schools: [] };
    }
    for (const item of record.schools) {
      const pin = publicPinFromRecord(item);
      if (!pin || seen.has(pin.id)) {
        continue;
      }
      seen.add(pin.id);
      schools.push(pin);
    }
    const next = typeof record.cursor === "string" ? record.cursor.trim() : "";
    if (!next || next === cursor) {
      return { access: "ready", schools };
    }
    cursor = next;
  }

  return { access: "ready", schools };
}
