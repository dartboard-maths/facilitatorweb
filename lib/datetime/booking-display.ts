/**
 * Stable date/time formatting for booking UI (avoids SSR/client hydration mismatches from
 * `toLocaleString()` without a fixed locale).
 */
const BOOKING_LOCALE = "en-GB";

export function formatBookingDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(BOOKING_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatBookingTimeRange(isoStart: string, isoEnd: string): string {
  const start = new Date(isoStart);
  const end = new Date(isoEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${isoStart} – ${isoEnd}`;
  }
  const timeFmt = new Intl.DateTimeFormat(BOOKING_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

/** Calendar column header from YYYY-MM-DD (interpreted as calendar date in UTC). */
export function formatBookingCalendarDayHeader(dateKey: string): string {
  const parts = dateKey.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return dateKey;
  }
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(BOOKING_LOCALE, {
    day: "2-digit",
    month: "short",
  })
    .format(dt)
    .toUpperCase();
}
