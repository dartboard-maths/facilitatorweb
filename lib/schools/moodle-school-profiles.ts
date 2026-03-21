/**
 * Decodes Moodle SSO `dbm_school_profiles_b64` (base64url JSON array).
 */

export type MoodleSchoolProfilePayload = {
  id: string;
  name: string;
  address_line1: string;
  address_line2: string;
  suburb: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
};

function decodeBase64UrlToUtf8(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const base64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const padded = pad === 0 ? base64 : base64 + "=".repeat(4 - pad);
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeSchoolId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const id = value.trim().toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(id)) {
    return null;
  }
  return id;
}

export function parseMoodleSchoolProfilesParam(raw: string | null): MoodleSchoolProfilePayload[] {
  if (!raw?.trim()) {
    return [];
  }
  const decoded = decodeBase64UrlToUtf8(raw);
  if (!decoded) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  const out: MoodleSchoolProfilePayload[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const id = sanitizeSchoolId(record.id);
    if (!id) {
      continue;
    }
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const str = (key: string) => (typeof record[key] === "string" ? (record[key] as string).trim() : "");
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (isFiniteNumber(record.latitude)) {
      latitude = record.latitude;
    }
    if (isFiniteNumber(record.longitude)) {
      longitude = record.longitude;
    }
    if (latitude !== null && (latitude < -90 || latitude > 90)) {
      latitude = null;
    }
    if (longitude !== null && (longitude < -180 || longitude > 180)) {
      longitude = null;
    }
    out.push({
      id,
      name,
      address_line1: str("address_line1"),
      address_line2: str("address_line2"),
      suburb: str("suburb"),
      city: str("city"),
      state: str("state"),
      postcode: str("postcode"),
      country: str("country"),
      latitude,
      longitude,
    });
  }
  return out;
}

export function formatSchoolAddressLines(profile: {
  address_line1: string;
  address_line2: string;
  suburb: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}): string[] {
  const line1 = [profile.address_line1, profile.address_line2].filter(Boolean).join(", ").trim();
  const locality = [profile.suburb, profile.city].filter(Boolean).join(", ").trim();
  const region = [profile.state, profile.postcode].filter(Boolean).join(" ").trim();
  const mid = [locality, region].filter(Boolean).join(", ").trim();
  const country = profile.country.trim().toUpperCase();
  const lines: string[] = [];
  if (line1) {
    lines.push(line1);
  }
  if (mid) {
    lines.push(mid);
  }
  if (country) {
    lines.push(country);
  }
  return lines;
}
