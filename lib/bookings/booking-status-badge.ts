/**
 * Maps `bookings.status` to Bootstrap 5 `text-bg-*` classes for badges.
 */
export function bookingStatusBadgeClass(status: string): string {
  const s = status.trim().toLowerCase().replace(/\s+/g, "_");
  switch (s) {
    case "pending":
      return "text-bg-secondary";
    case "changes_requested":
      return "text-bg-info";
    case "accepted":
    case "confirmed":
      return "text-bg-success";
    case "declined":
      return "text-bg-danger";
    case "cancelled":
      return "text-bg-dark";
    case "completed":
      return "text-bg-primary";
    case "cancellation_requested":
      return "text-bg-warning";
    default:
      return "text-bg-secondary";
  }
}

export function formatBookingStatusLabel(status: string): string {
  return status.trim().replace(/_/g, " ");
}
