import crypto from "node:crypto";

export type InspectorSchoolPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type InspectorSchoolFigures = {
  learners: string;
  courses: string;
  completion: string;
  grade: string;
  competencies: string;
  badges: string;
};

export type InspectorDirectoryAccess = "ready" | "not_inspector" | "unavailable";

const PATH = "/local/wpsso/inspector_schools.php";

function rawurlencode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function canonicalQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${rawurlencode(key)}=${rawurlencode(value)}`)
    .join("&");
}

function moodleOrigin(): string | null {
  const entry = process.env.MOODLE_SSO_ENTRY_URL?.trim();
  if (!entry) {
    return null;
  }
  try {
    return new URL(entry).origin;
  } catch {
    return null;
  }
}

function signRequest(query: string): { timestamp: string; signature: string } | null {
  const secret = process.env.MOODLE_MARKETPLACE_API_SECRET?.trim();
  if (!secret) {
    return null;
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  const payload = `${timestamp}|GET|${PATH}|${query}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return { timestamp, signature };
}

async function moodleGet(params: Record<string, string>): Promise<Response | null> {
  const origin = moodleOrigin();
  const query = canonicalQuery(params);
  const signed = signRequest(query);
  if (!origin || !signed) {
    return null;
  }
  const url = `${origin}${PATH}${query ? `?${query}` : ""}`;
  return fetch(url, {
    headers: {
      "X-DBM-Timestamp": signed.timestamp,
      "X-DBM-Signature": signed.signature,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
}

function finiteCoordinate(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    return null;
  }
  return number;
}

function schoolId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const id = value.trim().toUpperCase();
  return /^[A-Z0-9_-]+$/.test(id) ? id : null;
}

function pinFromRecord(value: unknown): InspectorSchoolPin | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = schoolId(record.id);
  const latitude = finiteCoordinate(record.lat, -90, 90);
  const longitude = finiteCoordinate(record.lng, -180, 180);
  if (!id || latitude === null || longitude === null) {
    return null;
  }
  const name = typeof record.name === "string" ? record.name.replace(/\s+/g, " ").trim() : "";
  return { id, name: name || id, latitude, longitude };
}

function figureText(value: unknown): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text || "—";
}

export function figuresFromRecord(value: unknown): InspectorSchoolFigures | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    learners: figureText(record.learners),
    courses: figureText(record.courses),
    completion: figureText(record.completion),
    grade: figureText(record.grade),
    competencies: figureText(record.competencies),
    badges: figureText(record.badges),
  };
}

export async function fetchInspectorSchools(moodleUserId: string): Promise<{
  access: InspectorDirectoryAccess;
  schools: InspectorSchoolPin[];
}> {
  if (!/^\d+$/.test(moodleUserId)) {
    return { access: "unavailable", schools: [] };
  }
  let response: Response | null;
  try {
    response = await moodleGet({ v: "1", moodle_user_id: moodleUserId });
  } catch (error) {
    console.error("Find a school list failed", error);
    return { access: "unavailable", schools: [] };
  }
  if (!response) {
    console.error("Find a school list is not configured");
    return { access: "unavailable", schools: [] };
  }
  if (response.status === 403) {
    return { access: "not_inspector", schools: [] };
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
  const schools = (body as { schools?: unknown }).schools;
  if (!Array.isArray(schools)) {
    return { access: "unavailable", schools: [] };
  }
  const pins: InspectorSchoolPin[] = [];
  const seen = new Set<string>();
  for (const item of schools) {
    const pin = pinFromRecord(item);
    if (!pin || seen.has(pin.id)) {
      continue;
    }
    seen.add(pin.id);
    pins.push(pin);
  }
  return { access: "ready", schools: pins };
}

export async function fetchInspectorSchoolFigures(
  moodleUserId: string,
  schoolIdValue: string,
): Promise<{ status: number; figures: InspectorSchoolFigures | null }> {
  const id = schoolId(schoolIdValue);
  if (!/^\d+$/.test(moodleUserId) || !id) {
    return { status: 404, figures: null };
  }
  let response: Response | null;
  try {
    response = await moodleGet({ v: "1", moodle_user_id: moodleUserId, school: id });
  } catch (error) {
    console.error("Find a school figures failed", error);
    return { status: 503, figures: null };
  }
  if (!response) {
    return { status: 503, figures: null };
  }
  if (!response.ok) {
    return { status: response.status, figures: null };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: 503, figures: null };
  }
  const figures = figuresFromRecord((body as { school?: unknown }).school);
  if (!figures) {
    return { status: 503, figures: null };
  }
  return { status: 200, figures };
}
