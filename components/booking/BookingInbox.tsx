import Link from "next/link";

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
};

const STATUS_TABS = [
  { id: "pending", label: "Pending" },
  { id: "changes_requested", label: "Changes requested" },
  { id: "accepted", label: "Accepted" },
  { id: "declined", label: "Declined" },
];

function prettyStatus(value: string): string {
  return value.replace(/_/g, " ");
}

export function BookingInbox({ role, activeStatus, items }: BookingInboxProps) {
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

        {items.length === 0 ? (
          <div className="text-secondary small">No bookings in this status.</div>
        ) : (
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
                  <span className="badge text-bg-light text-capitalize">{prettyStatus(item.status)}</span>
                </div>
                <div className="small text-secondary mt-1">
                  Created {new Date(item.createdAt).toLocaleString()} • Last activity{" "}
                  {new Date(item.lastActivityAt).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
