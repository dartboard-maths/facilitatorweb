import { formatSchoolAddressLines } from "./moodle-school-profiles";

export type SchoolLocationData = {
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

function toNullableLatitude(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= -90 && n <= 90 ? n : null;
}

function toNullableLongitude(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= -180 && n <= 180 ? n : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isMeaningfulSchoolData(data: SchoolLocationData): boolean {
  if (data.name.trim().length > 0) {
    return true;
  }
  if (formatSchoolAddressLines(data).length > 0) {
    return true;
  }
  return data.latitude !== null && data.longitude !== null;
}

/**
 * Parses `bookings.school_snapshot` JSON written at booking creation.
 */
export function parseBookingSchoolSnapshot(snapshot: unknown, schoolId: string): SchoolLocationData | null {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  const o = snapshot as Record<string, unknown>;
  const data: SchoolLocationData = {
    id: schoolId,
    name: str(o.name),
    address_line1: str(o.address_line1),
    address_line2: str(o.address_line2),
    suburb: str(o.suburb),
    city: str(o.city),
    state: str(o.state),
    postcode: str(o.postcode),
    country: str(o.country),
    latitude: toNullableLatitude(o.latitude),
    longitude: toNullableLongitude(o.longitude),
  };
  return isMeaningfulSchoolData(data) ? data : null;
}

/**
 * Maps a Supabase `schools` row to display model.
 */
export function schoolCatalogRowToLocationData(row: Record<string, unknown>, schoolId: string): SchoolLocationData | null {
  const data: SchoolLocationData = {
    id: typeof row.id === "string" ? row.id : schoolId,
    name: str(row.name),
    address_line1: str(row.address_line1),
    address_line2: str(row.address_line2),
    suburb: str(row.suburb),
    city: str(row.city),
    state: str(row.state),
    postcode: str(row.postcode),
    country: str(row.country),
    latitude: toNullableLatitude(row.latitude),
    longitude: toNullableLongitude(row.longitude),
  };
  return isMeaningfulSchoolData(data) ? data : null;
}

export type SchoolDisplaySource = "snapshot" | "catalog" | "none";

export function resolveSchoolLocationForBooking(input: {
  schoolSnapshot: unknown;
  catalogRow: Record<string, unknown> | null;
  schoolId: string;
}): { data: SchoolLocationData | null; source: SchoolDisplaySource } {
  const fromSnapshot = parseBookingSchoolSnapshot(input.schoolSnapshot, input.schoolId);
  if (fromSnapshot) {
    return { data: fromSnapshot, source: "snapshot" };
  }
  if (input.catalogRow) {
    const fromCatalog = schoolCatalogRowToLocationData(input.catalogRow, input.schoolId);
    if (fromCatalog) {
      return { data: fromCatalog, source: "catalog" };
    }
  }
  return { data: null, source: "none" };
}

/** Persistable JSON for `bookings.school_snapshot` (no `id` field). */
export function schoolLocationToSnapshotPayload(data: SchoolLocationData): Record<string, string | number | null> {
  return {
    name: data.name,
    address_line1: data.address_line1,
    address_line2: data.address_line2,
    suburb: data.suburb,
    city: data.city,
    state: data.state,
    postcode: data.postcode,
    country: data.country,
    latitude: data.latitude,
    longitude: data.longitude,
  };
}
