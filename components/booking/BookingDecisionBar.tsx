"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { BookingActionState } from "../../app/bookings/actions";

type BookingDecisionBarProps = {
  bookingId: string;
  canDecide: boolean;
  currentStatus: string;
  action: (state: BookingActionState, payload: FormData) => Promise<BookingActionState>;
};

const initialState: BookingActionState = {};

function DecisionSubmitButton({
  value,
  label,
  className,
}: {
  value: "accept" | "decline" | "request_changes";
  label: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="decision" value={value} className={className} disabled={pending}>
      {pending ? "Saving..." : label}
    </button>
  );
}

export function BookingDecisionBar({ bookingId, canDecide, currentStatus, action }: BookingDecisionBarProps) {
  const [state, formAction] = useFormState(action, initialState);
  const normalizedStatus = currentStatus.toLowerCase();
  const canTransition = canDecide && (normalizedStatus === "pending" || normalizedStatus === "changes_requested");

  if (!canTransition) {
    return (
      <div className="alert alert-light border mb-0">
        Booking is currently <strong>{currentStatus.replace(/_/g, " ")}</strong>. No decision required.
      </div>
    );
  }

  return (
    <form action={formAction} className="card border-0 shadow-sm">
      <div className="card-body p-3">
        <input type="hidden" name="booking_id" value={bookingId} />
        <label htmlFor="decision-note" className="form-label mb-1">
          Decision note (optional)
        </label>
        <textarea
          id="decision-note"
          name="note"
          className="form-control"
          rows={3}
          placeholder="Add context for your accept/decline/change request."
        />
        <div className="d-flex flex-wrap gap-2 mt-3">
          <DecisionSubmitButton value="accept" label="Accept" className="btn btn-success btn-sm" />
          <DecisionSubmitButton value="request_changes" label="Request changes" className="btn btn-outline-primary btn-sm" />
          <DecisionSubmitButton value="decline" label="Decline" className="btn btn-outline-danger btn-sm" />
        </div>
        {state.error && (
          <div className="text-danger small mt-2" role="alert">
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="text-success small mt-2" role="status">
            {state.success}
          </div>
        )}
      </div>
    </form>
  );
}
