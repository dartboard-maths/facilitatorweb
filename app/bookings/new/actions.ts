"use server";

import { revalidatePath } from "next/cache";
import { getMarketplaceSession } from "../../../lib/auth/session";
import { createAdminClient } from "../../../lib/supabase/admin";

export type BookingFormState = {
  error?: string;
  success?: string;
};

type AvailabilityRule = {
  weekday: number;
  start_time: string;
  end_time: string;
  recurrence_start_date: string | null;
  recurrence_end_date: string | null;
};

type AvailabilityOverride = {
  override_date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
};

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function weekdayFromDate(date: Date): number {
  // Keep weekday mapping aligned with tutor availability:
  // 0 = Sunday, 1 = Monday, ... 6 = Saturday.
  return date.getUTCDay();
}

function combineIso(date: string, time: string): string {
  return `${date}T${time}:00Z`;
}

function toMinutes(value: string): number {
  const [hour, minute] = value.split(":").map((part) => Number(part));
  return hour * 60 + minute;
}

function checkAvailabilityWindow(input: {
  date: string;
  startTime: string;
  endTime: string;
  rules: AvailabilityRule[];
  overrides: AvailabilityOverride[];
}): boolean {
  const { date, startTime, endTime, rules, overrides } = input;
  const dateObj = parseDate(date);
  if (!dateObj) return false;

  const blocked = overrides.find((o) => o.override_date === date && o.is_available === false);
  if (blocked) return false;

  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  if (endMinutes <= startMinutes) return false;

  const dayRules = rules.filter((r) => r.weekday === weekdayFromDate(dateObj));
  if (dayRules.length === 0) return false;

  return dayRules.some((rule) => {
    if (rule.recurrence_start_date && date < rule.recurrence_start_date) {
      return false;
    }
    if (rule.recurrence_end_date && date > rule.recurrence_end_date) {
      return false;
    }
    const ruleStart = toMinutes(String(rule.start_time).slice(0, 5));
    const ruleEnd = toMinutes(String(rule.end_time).slice(0, 5));
    return startMinutes >= ruleStart && endMinutes <= ruleEnd;
  });
}

function buildProgrammeDates(input: {
  startDate: string;
  endDate: string;
  weekday: number;
}): string[] {
  const { startDate, endDate, weekday } = input;
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || end < start) return [];

  const dates: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    if (weekdayFromDate(cursor) === weekday) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function hasOverlap(
  existing: Array<{ session_start: string; session_end: string }>,
  candidateStartIso: string,
  candidateEndIso: string,
): boolean {
  const candidateStart = new Date(candidateStartIso).getTime();
  const candidateEnd = new Date(candidateEndIso).getTime();
  return existing.some((session) => {
    const existingStart = new Date(session.session_start).getTime();
    const existingEnd = new Date(session.session_end).getTime();
    return existingStart < candidateEnd && existingEnd > candidateStart;
  });
}

export async function createBookingRequest(
  _prevState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const session = await getMarketplaceSession();
  if (!session) {
    return { error: "You must be signed in to create bookings." };
  }
  if (!session.isSchoolAdmin) {
    return { error: "Only school admins can create bookings." };
  }

  const supabase = createAdminClient();
  const tutorUserId = String(formData.get("tutor_user_id") ?? "").trim();
  const schoolId = String(formData.get("school_id") ?? "").trim().toUpperCase();
  const bookingType = String(formData.get("booking_type") ?? "").trim();
  const timezone = String(formData.get("requested_timezone") ?? "UTC").trim() || "UTC";
  const notes = String(formData.get("notes") ?? "").trim();

  if (!tutorUserId || !schoolId) {
    return { error: "Tutor and school are required." };
  }
  if (!session.managedSchoolIds.includes(schoolId)) {
    return { error: "You can only book tutors for your managed schools." };
  }
  if (bookingType !== "single_lesson" && bookingType !== "programme_block") {
    return { error: "Invalid booking type." };
  }

  const { data: rulesRows, error: rulesError } = await supabase
    .from("tutor_availability_rules")
    .select("weekday,start_time,end_time,recurrence_start_date,recurrence_end_date")
    .eq("tutor_user_id", tutorUserId)
    .eq("is_active", true);
  if (rulesError) return { error: rulesError.message };
  const rules = (rulesRows ?? []) as AvailabilityRule[];
  if (rules.length === 0) {
    return { error: "Tutor has not set availability yet." };
  }

  const { data: overrideRows, error: overridesError } = await supabase
    .from("tutor_availability_overrides")
    .select("override_date,is_available,start_time,end_time")
    .eq("tutor_user_id", tutorUserId);
  if (overridesError) return { error: overridesError.message };
  const overrides = (overrideRows ?? []) as AvailabilityOverride[];

  let sessionWindows: Array<{ startIso: string; endIso: string; date: string }> = [];
  let programmeStartDate: string | null = null;
  let programmeEndDate: string | null = null;

  if (bookingType === "single_lesson") {
    const date = String(formData.get("single_date") ?? "").trim();
    const start = String(formData.get("single_start_time") ?? "").trim();
    const end = String(formData.get("single_end_time") ?? "").trim();
    if (!parseDate(date) || !start || !end) {
      return { error: "Single lesson requires date, start time, and end time." };
    }
    if (
      !checkAvailabilityWindow({
        date,
        startTime: start,
        endTime: end,
        rules,
        overrides,
      })
    ) {
      return { error: "Requested single lesson is outside tutor availability." };
    }
    sessionWindows = [{ date, startIso: combineIso(date, start), endIso: combineIso(date, end) }];
  } else {
    const startDate = String(formData.get("programme_start_date") ?? "").trim();
    const endDate = String(formData.get("programme_end_date") ?? "").trim();
    const weekday = Number(formData.get("programme_weekday"));
    const startTime = String(formData.get("programme_start_time") ?? "").trim();
    const endTime = String(formData.get("programme_end_time") ?? "").trim();

    if (!parseDate(startDate) || !parseDate(endDate) || !Number.isInteger(weekday) || !startTime || !endTime) {
      return { error: "Programme booking requires date range, weekday, start and end time." };
    }
    if (weekday < 0 || weekday > 6) {
      return { error: "Programme weekday is invalid." };
    }

    const programmeDates = buildProgrammeDates({ startDate, endDate, weekday });
    if (programmeDates.length === 0) {
      return { error: "Programme date range does not contain the selected weekday." };
    }

    for (const date of programmeDates) {
      if (
        !checkAvailabilityWindow({
          date,
          startTime,
          endTime,
          rules,
          overrides,
        })
      ) {
        return { error: `Tutor is not available for ${date} at the requested time.` };
      }
      sessionWindows.push({
        date,
        startIso: combineIso(date, startTime),
        endIso: combineIso(date, endTime),
      });
    }
    programmeStartDate = startDate;
    programmeEndDate = endDate;
  }

  const earliestStart = sessionWindows[0]?.startIso;
  const latestEnd = sessionWindows[sessionWindows.length - 1]?.endIso;
  if (!earliestStart || !latestEnd) {
    return { error: "No booking sessions were generated." };
  }

  const { data: existingSessions, error: existingSessionsError } = await supabase
    .from("booking_sessions")
    .select("session_start,session_end,status")
    .eq("tutor_user_id", tutorUserId)
    .neq("status", "cancelled")
    .lt("session_start", latestEnd)
    .gt("session_end", earliestStart);
  if (existingSessionsError) {
    return { error: existingSessionsError.message };
  }
  const collisionSet = (existingSessions ?? []) as Array<{ session_start: string; session_end: string }>;
  const hasConflicts = sessionWindows.some((window) =>
    hasOverlap(collisionSet, window.startIso, window.endIso),
  );
  if (hasConflicts) {
    return { error: "One or more requested sessions overlap an existing booking." };
  }

  const { data: bookingRow, error: bookingInsertError } = await supabase
    .from("bookings")
    .insert({
      school_admin_user_id: session.sub,
      tutor_user_id: tutorUserId,
      school_id: schoolId,
      booking_type: bookingType,
      requested_timezone: timezone,
      notes: notes || null,
      programme_start_date: programmeStartDate,
      programme_end_date: programmeEndDate,
      status: "pending",
    })
    .select("id")
    .single();
  if (bookingInsertError || !bookingRow) {
    return { error: bookingInsertError?.message ?? "Failed to create booking." };
  }

  const bookingId = bookingRow.id as string;
  const sessionsPayload = sessionWindows.map((window) => ({
    booking_id: bookingId,
    tutor_user_id: tutorUserId,
    session_start: window.startIso,
    session_end: window.endIso,
    status: "scheduled",
  }));
  const { error: sessionsInsertError } = await supabase
    .from("booking_sessions")
    .insert(sessionsPayload);
  if (sessionsInsertError) {
    await supabase.from("bookings").delete().eq("id", bookingId);
    return { error: sessionsInsertError.message };
  }

  const summaryMessage =
    bookingType === "single_lesson"
      ? `Booking request created for ${sessionWindows[0]?.date ?? "selected date"} (${sessionWindows[0]?.startIso.slice(11, 16) ?? "--:--"}-${sessionWindows[0]?.endIso.slice(11, 16) ?? "--:--"}).`
      : `Programme booking created (${programmeStartDate ?? "?"} to ${programmeEndDate ?? "?"}) with ${sessionWindows.length} sessions.`;
  const { error: messageInsertError } = await supabase.from("booking_messages").insert({
    booking_id: bookingId,
    sender_user_id: session.sub,
    sender_role: "school_admin",
    message_type: "booking_created",
    body: summaryMessage,
  });
  if (messageInsertError && !/booking_messages/i.test(messageInsertError.message)) {
    return { error: messageInsertError.message };
  }

  revalidatePath("/tutors");
  return { success: "Booking request created. Awaiting tutor confirmation." };
}

