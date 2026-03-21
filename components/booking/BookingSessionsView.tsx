"use client";

import { useMemo, useState } from "react";

type BookingSession = {
  id: string;
  sessionStart: string;
  sessionEnd: string;
  status: string;
};

type BookingSessionsViewProps = {
  sessions: BookingSession[];
};

const WEEKDAYS = [
  { value: 0, label: "SUN" },
  { value: 1, label: "MON" },
  { value: 2, label: "TUE" },
  { value: 3, label: "WED" },
  { value: 4, label: "THU" },
  { value: 5, label: "FRI" },
  { value: 6, label: "SAT" },
];

function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function BookingSessionsView({ sessions }: BookingSessionsViewProps) {
  const [mode, setMode] = useState<"list" | "calendar">("list");
  const slotGrid = useMemo(() => {
    const dateSet = new Set<string>();
    const slotMap = new Map<string, BookingSession[]>();

    sessions.forEach((session) => {
      const start = new Date(session.sessionStart);
      const dateKey = toDateKey(start);
      const weekday = start.getDay();
      dateSet.add(dateKey);
      const mapKey = `${weekday}-${dateKey}`;
      const entries = slotMap.get(mapKey) ?? [];
      entries.push(session);
      slotMap.set(mapKey, entries);
    });

    const dates = Array.from(dateSet).sort((a, b) => a.localeCompare(b));
    return { dates, slotMap };
  }, [sessions]);

  return (
    <div>
      <div className="d-flex gap-2 mb-2">
        <button
          type="button"
          className={`btn btn-sm ${mode === "list" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setMode("list")}
        >
          List
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "calendar" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setMode("calendar")}
        >
          Calendar
        </button>
      </div>

      {mode === "list" ? (
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th scope="col">Start</th>
                <th scope="col">End</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.sessionStart).toLocaleString()}</td>
                  <td>{new Date(row.sessionEnd).toLocaleString()}</td>
                  <td className="text-capitalize">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : slotGrid.dates.length === 0 ? (
        <div className="small text-secondary">No sessions available to display.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0 font-monospace" style={{ fontSize: "14px" }}>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="position-sticky start-0 bg-light"
                  style={{ zIndex: 2, minWidth: 96, lineHeight: "normal" }}
                />
                {slotGrid.dates.map((date) => (
                  <th key={date} scope="col" style={{ lineHeight: "normal" }}>
                    {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                    }).toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map((day) => (
                <tr key={day.value}>
                  <th
                    scope="row"
                    className="text-nowrap position-sticky start-0 bg-white"
                    style={{ zIndex: 1, minWidth: 96, lineHeight: "normal" }}
                  >
                    {day.label}
                  </th>
                  {slotGrid.dates.map((date) => {
                    const items = slotGrid.slotMap.get(`${day.value}-${date}`) ?? [];
                    return (
                      <td key={`${day.value}-${date}`}>
                        <div className="d-flex flex-column gap-1">
                          {items.map((session) => (
                            <span
                              key={session.id}
                              className={`badge text-start ${
                                session.status === "cancelled" ? "text-bg-secondary" : "text-bg-success"
                              }`}
                              style={{
                                whiteSpace: "nowrap",
                                lineHeight: "normal",
                                paddingTop: "8px",
                                paddingBottom: "8px",
                              }}
                            >
                              {new Date(session.sessionStart).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {" - "}
                              {new Date(session.sessionEnd).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
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
      )}
    </div>
  );
}
