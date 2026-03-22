import Link from "next/link";
import { formatBookingDateTime } from "../../lib/datetime/booking-display";
import { bookingStatusBadgeClass, formatBookingStatusLabel } from "../../lib/bookings/booking-status-badge";

export type BookingInboxItem = {
  id: string;
  status: string;
  bookingType: string;
  schoolId: string;
  tutorName: string;
  schoolAdminName: string;
  createdAt: string;
  lastActivityAt: string;
};

type BookingInboxProps = {
  role: "tutor" | "school_admin";
  activeStatus: string;
  items: BookingInboxItem[];
  /** When set (All tab), render one list in order: active, then other, then cancelled (no section headings). */
  grouped?: {
    active: BookingInboxItem[];
    other: BookingInboxItem[];
    cancelled: BookingInboxItem[];
  } | null;
};

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "changes_requested", label: "Changes requested" },
  { id: "accepted", label: "Accepted" },
  { id: "cancellation_requested", label: "Cancellation requested" },
  { id: "declined", label: "Declined" },
  { id: "cancelled", label: "Cancelled" },
];

function BookingList({
  role,
  items,
}: {
  role: BookingInboxProps["role"];
  items: BookingInboxItem[];
}) {
  if (items.length === 0) {
    return <div className="text-secondary small">None in this group.</div>;
  }
  return (
    <div className="list-group">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/bookings/${encodeURIComponent(item.id)}`}
          className="list-group-item list-group-item-action"
        >
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <div className="fw-semibold">
                {role === "tutor" ? item.schoolAdminName : item.tutorName}
              </div>
              <div className="small text-secondary">
                {item.bookingType === "programme_block" ? "Programme block" : "Single lesson"} - School{" "}
                {item.schoolId}
              </div>
            </div>
            <span
              className={`badge ${bookingStatusBadgeClass(item.status)} text-capitalize`}
            >
              {formatBookingStatusLabel(item.status)}
            </span>
          </div>
          <div className="small text-secondary mt-1">
            Created {formatBookingDateTime(item.createdAt)} • Last activity{" "}
            {formatBookingDateTime(item.lastActivityAt)}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function BookingInbox({ role, activeStatus, items, grouped }: BookingInboxProps) {
  return (
    <section className="card border-0 shadow-sm">
      <div className="card-body p-4">
        <div className="d-flex flex-wrap gap-2 mb-3">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={`/bookings?status=${encodeURIComponent(tab.id)}`}
              className={`btn btn-sm ${activeStatus === tab.id ? "btn-primary" : "btn-outline-primary"}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {grouped ? (
          grouped.active.length + grouped.other.length + grouped.cancelled.length === 0 ? (
            <div className="text-secondary small">No bookings yet.</div>
          ) : (
            <BookingList
              role={role}
              items={[...grouped.active, ...grouped.other, ...grouped.cancelled]}
            />
          )
        ) : items.length === 0 ? (
          <div className="text-secondary small">No bookings in this status.</div>
        ) : (
          <BookingList role={role} items={items} />
        )}
      </div>
    </section>
  );
}
