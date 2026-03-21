"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { BookingFormState } from "../../app/bookings/new/actions";

type BookingRequestFormProps = {
  action: (
    state: BookingFormState,
    payload: FormData,
  ) => Promise<BookingFormState>;
  tutorUserId: string;
  tutorName: string;
  schoolIds: string[];
  availabilityRules: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
    recurrenceStartDate: string | null;
    recurrenceEndDate: string | null;
  }>;
  blockedDates: string[];
};

const initialState: BookingFormState = {};
const weekdays = [
  { value: 0, label: "Sunday", shortLabel: "SUN" },
  { value: 1, label: "Monday", shortLabel: "MON" },
  { value: 2, label: "Tuesday", shortLabel: "TUE" },
  { value: 3, label: "Wednesday", shortLabel: "WED" },
  { value: 4, label: "Thursday", shortLabel: "THU" },
  { value: 5, label: "Friday", shortLabel: "FRI" },
  { value: 6, label: "Saturday", shortLabel: "SAT" },
];
const TERM_PLANNING_LOOKAHEAD_DAYS = 92;

function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function addDaysToDateKey(value: string, days: number): string {
  const date = fromDateKey(value);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? "Submitting..." : "Request booking"}
    </button>
  );
}

export function BookingRequestForm({
  action,
  tutorUserId,
  tutorName,
  schoolIds,
  availabilityRules,
  blockedDates,
}: BookingRequestFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const [bookingType, setBookingType] = useState<"single_lesson" | "programme_block">("single_lesson");
  const [requestedTimezone, setRequestedTimezone] = useState("UTC");
  const [singleDate, setSingleDate] = useState("");
  const [singleStartTime, setSingleStartTime] = useState("");
  const [singleEndTime, setSingleEndTime] = useState("");
  const [programmeStartDate, setProgrammeStartDate] = useState("");
  const [programmeEndDate, setProgrammeEndDate] = useState("");
  const [programmeWeekday, setProgrammeWeekday] = useState("0");
  const [programmeStartTime, setProgrammeStartTime] = useState("");
  const [programmeEndTime, setProgrammeEndTime] = useState("");
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const defaultSchoolId = useMemo(() => schoolIds[0] ?? "", [schoolIds]);
  const blockedDateSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const slotLookaheadDays = TERM_PLANNING_LOOKAHEAD_DAYS;

  const slotGrid = useMemo(() => {
    const dates: Array<{
      date: string;
      label: string;
      slots: Array<{ startTime: string; endTime: string; weekday: number }>;
    }> = [];
    for (let offset = 0; offset < slotLookaheadDays; offset += 1) {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      const dateKey = toDateKey(date);
      if (blockedDateSet.has(dateKey)) {
        continue;
      }
      const weekday = date.getDay();
      const daySlots = availabilityRules
        .filter((rule) => {
          if (rule.weekday !== weekday) return false;
          if (rule.recurrenceStartDate && dateKey < rule.recurrenceStartDate) return false;
          if (rule.recurrenceEndDate && dateKey > rule.recurrenceEndDate) return false;
          return true;
        })
        .map((rule) => ({
          startTime: rule.startTime,
          endTime: rule.endTime,
          weekday,
        }));

      if (daySlots.length === 0) {
        continue;
      }

      dates.push({
        date: dateKey,
        label: date.toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
        }).toUpperCase(),
        slots: daySlots,
      });
    }

    const slotMap = new Map<string, Array<{ startTime: string; endTime: string; weekday: number }>>();
    dates.forEach((item) => {
      slotMap.set(`${item.slots[0]?.weekday ?? -1}-${item.date}`, item.slots);
    });

    return { dates, slotMap };
  }, [availabilityRules, blockedDateSet, slotLookaheadDays]);

  const programmeSlotGroups = useMemo(() => {
    const today = new Date();
    const todayKey = toDateKey(today);
    const horizonDate = new Date(today);
    horizonDate.setDate(horizonDate.getDate() + slotLookaheadDays - 1);
    const horizonKey = toDateKey(horizonDate);

    const groups = new Map<
      string,
      {
        weekday: number;
        startTime: string;
        endTime: string;
        ranges: Array<{ startDate: string; endDate: string }>;
      }
    >();

    availabilityRules.forEach((rule) => {
      const windowStart = rule.recurrenceStartDate && rule.recurrenceStartDate > todayKey
        ? rule.recurrenceStartDate
        : todayKey;
      const windowEnd = rule.recurrenceEndDate && rule.recurrenceEndDate < horizonKey
        ? rule.recurrenceEndDate
        : horizonKey;

      if (windowEnd < windowStart) {
        return;
      }

      const cursor = fromDateKey(windowStart);
      while (cursor.getDay() !== rule.weekday) {
        cursor.setDate(cursor.getDate() + 1);
      }

      const activeDates: string[] = [];
      while (toDateKey(cursor) <= windowEnd) {
        const dateKey = toDateKey(cursor);
        if (!blockedDateSet.has(dateKey)) {
          activeDates.push(dateKey);
        }
        cursor.setDate(cursor.getDate() + 7);
      }

      if (activeDates.length === 0) {
        return;
      }

      const ranges: Array<{ startDate: string; endDate: string }> = [];
      let rangeStart = activeDates[0] ?? "";
      let prevDate = activeDates[0] ?? "";
      for (let index = 1; index < activeDates.length; index += 1) {
        const currentDate = activeDates[index] ?? "";
        const expectedNext = addDaysToDateKey(prevDate, 7);
        if (currentDate !== expectedNext) {
          ranges.push({ startDate: rangeStart, endDate: prevDate });
          rangeStart = currentDate;
        }
        prevDate = currentDate;
      }
      ranges.push({ startDate: rangeStart, endDate: prevDate });

      const key = `${rule.weekday}-${rule.startTime}-${rule.endTime}`;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
          ranges,
        });
      } else {
        existing.ranges.push(...ranges);
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.weekday !== b.weekday) return a.weekday - b.weekday;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [availabilityRules, blockedDateSet, slotLookaheadDays]);

  const handleSlotSelect = (slot: {
    date: string;
    startTime: string;
    endTime: string;
    weekday: number;
  }) => {
    const slotKey = `${slot.date}-${slot.startTime}-${slot.endTime}`;
    setSelectedSlotKey(slotKey);

    if (bookingType === "single_lesson") {
      setSingleDate(slot.date);
      setSingleStartTime(slot.startTime);
      setSingleEndTime(slot.endTime);
      return;
    }

    setProgrammeWeekday(String(slot.weekday));
    setProgrammeStartTime(slot.startTime);
    setProgrammeEndTime(slot.endTime);
    setProgrammeStartDate((prev) => prev || slot.date);
    setProgrammeEndDate((prev) => prev || slot.date);
  };

  const handleProgrammeRangeSelect = (selection: {
    weekday: number;
    startTime: string;
    endTime: string;
    startDate: string;
    endDate: string;
  }) => {
    const rangeKey = `${selection.weekday}-${selection.startTime}-${selection.endTime}-${selection.startDate}-${selection.endDate}`;
    setSelectedSlotKey(rangeKey);
    setProgrammeWeekday(String(selection.weekday));
    setProgrammeStartTime(selection.startTime);
    setProgrammeEndTime(selection.endTime);
    setProgrammeStartDate(selection.startDate);
    setProgrammeEndDate(selection.endDate);
  };

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      setRequestedTimezone(timezone);
    }
  }, []);

  return (
    <form action={formAction} className="card border-0 shadow-sm">
      <div className="card-body p-4">
        <h1 className="h3 mb-2">Book Tutor</h1>
        <p className="text-secondary mb-4">
          Create a booking request for <strong>{tutorName}</strong>.
        </p>

        <input type="hidden" name="tutor_user_id" value={tutorUserId} />

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label htmlFor="school_id" className="form-label">
              School
            </label>
            <select id="school_id" name="school_id" className="form-select" defaultValue={defaultSchoolId} required>
              {schoolIds.map((schoolId) => (
                <option key={schoolId} value={schoolId}>
                  {schoolId}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label htmlFor="booking_type" className="form-label">
              Booking type
            </label>
            <select
              id="booking_type"
              name="booking_type"
              className="form-select"
              value={bookingType}
              onChange={(event) => setBookingType(event.target.value as "single_lesson" | "programme_block")}
            >
              <option value="single_lesson">Single lesson</option>
              <option value="programme_block">Programme block</option>
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label htmlFor="requested_timezone" className="form-label">
              Timezone
            </label>
            <input
              id="requested_timezone"
              name="requested_timezone"
              type="text"
              className="form-control"
              value={requestedTimezone}
              onChange={(event) => setRequestedTimezone(event.target.value)}
              required
            />
          </div>

          <div className="col-12">
            <div className="border rounded p-3 bg-light-subtle">
              <div className="fw-semibold mb-2">Upcoming availability (next 3 months)</div>
              <div className="small text-secondary mb-2">
                Click a slot to auto-fill the booking fields.
              </div>
              {bookingType === "single_lesson" ? (
                slotGrid.dates.length === 0 ? (
                  <div className="small text-secondary">No active slots found in the next 3 months.</div>
                ) : (
                  <div className="table-responsive">
                    <table
                      className="table table-sm align-middle mb-0 font-monospace"
                      style={{ fontSize: "14px", lineHeight: "normal" }}
                    >
                      <thead>
                        <tr>
                          <th
                            scope="col"
                            className="position-sticky start-0 bg-light"
                            style={{ zIndex: 2, minWidth: 96 }}
                          />
                          {slotGrid.dates.map((item) => (
                            <th key={item.date} scope="col">
                              {item.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {weekdays.map((weekday) => (
                          <tr key={weekday.value}>
                            <th
                              scope="row"
                              className="text-nowrap position-sticky start-0 bg-white"
                              style={{ zIndex: 1, minWidth: 96 }}
                            >
                              {weekday.shortLabel}
                            </th>
                            {slotGrid.dates.map((item) => {
                              const cellSlots = slotGrid.slotMap.get(`${weekday.value}-${item.date}`) ?? [];
                              return (
                                <td key={`${weekday.value}-${item.date}`}>
                                  <div className="d-flex flex-column gap-1">
                                    {cellSlots.map((slot) => (
                                      <button
                                        key={`${item.date}-${slot.startTime}-${slot.endTime}`}
                                        type="button"
                                        className={`btn btn-sm ${
                                          selectedSlotKey === `${item.date}-${slot.startTime}-${slot.endTime}`
                                            ? "btn-success"
                                            : "btn-outline-success"
                                        }`}
                                        style={{ lineHeight: "normal" }}
                                        onClick={() =>
                                          handleSlotSelect({
                                            date: item.date,
                                            startTime: slot.startTime,
                                            endTime: slot.endTime,
                                            weekday: slot.weekday,
                                          })
                                        }
                                      >
                                        {slot.startTime} - {slot.endTime}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : programmeSlotGroups.length === 0 ? (
                <div className="small text-secondary">
                  No recurring programme slots found in the next 3 months.
                </div>
              ) : (
                <div className="table-responsive">
                  <table
                    className="table table-sm align-middle mb-0 font-monospace"
                    style={{ fontSize: "14px", lineHeight: "normal" }}
                  >
                    <thead>
                      <tr>
                        <th scope="col">Day</th>
                        <th scope="col">Slot</th>
                        <th scope="col">Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programmeSlotGroups.map((group) => {
                        const weekday = weekdays.find((item) => item.value === group.weekday);
                        return (
                          <tr key={`${group.weekday}-${group.startTime}-${group.endTime}`}>
                            <td>{weekday?.shortLabel ?? group.weekday}</td>
                            <td>{group.startTime} - {group.endTime}</td>
                            <td className="d-flex flex-wrap gap-1">
                              {group.ranges.map((range) => {
                                const rangeKey = `${group.weekday}-${group.startTime}-${group.endTime}-${range.startDate}-${range.endDate}`;
                                return (
                                  <button
                                    key={rangeKey}
                                    type="button"
                                    className={`btn btn-sm ${
                                      selectedSlotKey === rangeKey ? "btn-success" : "btn-outline-success"
                                    }`}
                                    style={{ lineHeight: "normal" }}
                                    onClick={() =>
                                      handleProgrammeRangeSelect({
                                        weekday: group.weekday,
                                        startTime: group.startTime,
                                        endTime: group.endTime,
                                        startDate: range.startDate,
                                        endDate: range.endDate,
                                      })
                                    }
                                  >
                                    {range.startDate} - {range.endDate}
                                  </button>
                                );
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {bookingType === "single_lesson" ? (
            <>
              <div className="col-12 col-md-6">
                <label htmlFor="single_date" className="form-label">
                  Date
                </label>
                <input
                  id="single_date"
                  name="single_date"
                  type="date"
                  className="form-control"
                  value={singleDate}
                  onChange={(event) => setSingleDate(event.target.value)}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="single_start_time" className="form-label">
                  Start time
                </label>
                <input
                  id="single_start_time"
                  name="single_start_time"
                  type="time"
                  className="form-control"
                  value={singleStartTime}
                  onChange={(event) => setSingleStartTime(event.target.value)}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="single_end_time" className="form-label">
                  End time
                </label>
                <input
                  id="single_end_time"
                  name="single_end_time"
                  type="time"
                  className="form-control"
                  value={singleEndTime}
                  onChange={(event) => setSingleEndTime(event.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="col-12 col-md-6">
                <label htmlFor="programme_start_date" className="form-label">
                  Programme start date
                </label>
                <input
                  id="programme_start_date"
                  name="programme_start_date"
                  type="date"
                  className="form-control"
                  value={programmeStartDate}
                  onChange={(event) => setProgrammeStartDate(event.target.value)}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="programme_end_date" className="form-label">
                  Programme end date
                </label>
                <input
                  id="programme_end_date"
                  name="programme_end_date"
                  type="date"
                  className="form-control"
                  value={programmeEndDate}
                  onChange={(event) => setProgrammeEndDate(event.target.value)}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="programme_weekday" className="form-label">
                  Weekday
                </label>
                <select
                  id="programme_weekday"
                  name="programme_weekday"
                  className="form-select"
                  value={programmeWeekday}
                  onChange={(event) => setProgrammeWeekday(event.target.value)}
                >
                  {weekdays.map((weekday) => (
                    <option key={weekday.value} value={weekday.value}>
                      {weekday.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="programme_start_time" className="form-label">
                  Session start time
                </label>
                <input
                  id="programme_start_time"
                  name="programme_start_time"
                  type="time"
                  className="form-control"
                  value={programmeStartTime}
                  onChange={(event) => setProgrammeStartTime(event.target.value)}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="programme_end_time" className="form-label">
                  Session end time
                </label>
                <input
                  id="programme_end_time"
                  name="programme_end_time"
                  type="time"
                  className="form-control"
                  value={programmeEndTime}
                  onChange={(event) => setProgrammeEndTime(event.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="col-12">
            <label htmlFor="notes" className="form-label">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              className="form-control"
              rows={4}
              placeholder="Optional booking notes for the tutor."
            />
          </div>
        </div>

        <div className="mt-4 d-flex align-items-center gap-3">
          <SubmitButton />
          {state.error && (
            <span className="text-danger" role="alert">
              {state.error}
            </span>
          )}
          {state.success && (
            <span className="text-success" role="status">
              {state.success}
            </span>
          )}
        </div>
      </div>
    </form>
  );
}

