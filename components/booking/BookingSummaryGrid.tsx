import { bookingStatusBadgeClass, formatBookingStatusLabel } from "../../lib/bookings/booking-status-badge";

/**
 * Tutor / school admin / status — compact table inside the booking school card.
 * Presentation-only — callers supply formatted strings.
 */
export type BookingSummaryGridProps = {
  tutorName: string;
  schoolAdminName: string;
  /** Raw status e.g. `pending`, `accepted_by_tutor` */
  status: string;
  bookingType: string;
  programmeStartDate?: string | null;
  programmeEndDate?: string | null;
  notes?: string | null;
};

function bookingTypeLabel(bookingType: string): string {
  return bookingType === "programme_block" ? "Programme block" : "Single lesson";
}

export function BookingSummaryGrid({
  tutorName,
  schoolAdminName,
  status,
  bookingType,
  programmeStartDate,
  programmeEndDate,
  notes,
}: BookingSummaryGridProps) {
  const showProgrammeRange = bookingType === "programme_block";

  return (
    <div className="mt-3 pt-3 border-top">
      <table className="table table-sm table-borderless mb-0">
        <tbody className="small">
          <tr>
            <th scope="row" className="text-secondary fw-normal text-nowrap align-top py-1 ps-0 pe-2">
              Tutor
            </th>
            <td className="fw-semibold align-top py-1 pe-0">{tutorName}</td>
          </tr>
          <tr>
            <th scope="row" className="text-secondary fw-normal text-nowrap align-top py-1 ps-0 pe-2">
              School admin
            </th>
            <td className="fw-semibold align-top py-1 pe-0">{schoolAdminName}</td>
          </tr>
          <tr>
            <th scope="row" className="text-secondary fw-normal text-nowrap align-top py-1 ps-0 pe-2">
              Status
            </th>
            <td className="align-top py-1 pe-0">
              <span
                className={`badge ${bookingStatusBadgeClass(status)} text-capitalize`}
              >
                {formatBookingStatusLabel(status)}
              </span>
            </td>
          </tr>
          <tr>
            <th scope="row" className="text-secondary fw-normal text-nowrap align-top py-1 ps-0 pe-2">
              Type
            </th>
            <td className="align-top py-1 pe-0">{bookingTypeLabel(bookingType)}</td>
          </tr>
          {showProgrammeRange ? (
            <tr>
              <th scope="row" className="text-secondary fw-normal text-nowrap align-top py-1 ps-0 pe-2">
                Programme range
              </th>
              <td className="align-top py-1 pe-0">
                {(programmeStartDate ?? "?") + " to " + (programmeEndDate ?? "?")}
              </td>
            </tr>
          ) : null}
          {notes ? (
            <tr>
              <th scope="row" className="text-secondary fw-normal text-nowrap align-top py-1 ps-0 pe-2">
                Request notes
              </th>
              <td className="align-top py-1 pe-0 text-break">{notes}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
