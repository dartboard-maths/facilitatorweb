/** Moodle category idnumber as stored on bookings / schools (uppercased). */
export function normalizeMarketplaceSchoolId(raw: string): string {
  return raw.trim().toUpperCase();
}
