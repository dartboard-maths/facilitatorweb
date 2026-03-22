"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useFormState } from "react-dom";
import type { BookingActionState } from "../../app/bookings/actions";
import { submitCancelActiveBookingRequest } from "../../app/bookings/active-cancellation-actions";

const initialState: BookingActionState = {};

type BookingActiveCancellationModalProps = {
  bookingId: string;
};

export function BookingActiveCancellationModal({ bookingId }: BookingActiveCancellationModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const modalId = useId();
  const [state, formAction] = useFormState(submitCancelActiveBookingRequest, initialState);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <>
      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setOpen(true)}>
        Request cancellation
      </button>

      {open ? (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${modalId}-title`}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form action={formAction}>
                <div className="modal-header">
                  <h2 className="modal-title h5" id={`${modalId}-title`}>
                    Request cancellation
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setOpen(false)}
                  />
                </div>
                <div className="modal-body">
                  <input type="hidden" name="booking_id" value={bookingId} />
                  <p className="small text-secondary">
                    The other party must accept this request before the booking is cancelled. Explain your reason
                    below.
                  </p>
                  <label htmlFor={`${modalId}-comment`} className="form-label">
                    Comments
                  </label>
                  <textarea
                    id={`${modalId}-comment`}
                    name="comment"
                    className="form-control"
                    rows={4}
                    required
                    placeholder="Reason for cancellation request..."
                  />
                  {state.error ? (
                    <div className="text-danger small mt-2" role="alert">
                      {state.error}
                    </div>
                  ) : null}
                  {state.success ? (
                    <div className="text-success small mt-2" role="status">
                      {state.success}
                    </div>
                  ) : null}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOpen(false)}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-danger btn-sm">
                    Send request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
