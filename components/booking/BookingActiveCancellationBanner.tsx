"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useFormState } from "react-dom";
import { postBookingMessage, type BookingActionState } from "../../app/bookings/actions";
import { acceptCancelActiveBookingRequest } from "../../app/bookings/active-cancellation-actions";
import type { BookingActorRole } from "../../lib/bookings/resolve-booking-actor-role";

const initialState: BookingActionState = {};

type BookingActiveCancellationBannerProps = {
  bookingId: string;
  /** Current marketplace view role (cookie / role-select). */
  viewerViewRole: BookingActorRole;
  /** Computed on the server: dual-role same user vs initiator role, or different users. */
  isCounterparty: boolean;
  cancellationRequestComment: string | null;
  /** Resolved from `users` — who initiated the cancellation request. */
  originatorDisplayName: string;
  /** Role hat used to submit the request (Tutor vs School admin). */
  initiatorRoleLabel: string;
};

function ModalBackdrop({
  titleId,
  children,
  onClose,
}: {
  titleId: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

export function BookingActiveCancellationBanner({
  bookingId,
  viewerViewRole,
  isCounterparty,
  cancellationRequestComment,
  originatorDisplayName,
  initiatorRoleLabel,
}: BookingActiveCancellationBannerProps) {
  const router = useRouter();
  const baseId = useId();
  const respondTitleId = `${baseId}-respond-title`;
  const acceptTitleId = `${baseId}-accept-title`;

  const [respondOpen, setRespondOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);

  const [messageState, messageAction] = useFormState(postBookingMessage, initialState);
  const [acceptState, acceptAction] = useFormState(acceptCancelActiveBookingRequest, initialState);

  useEffect(() => {
    if (messageState.success) {
      setRespondOpen(false);
      router.refresh();
    }
  }, [messageState.success, router]);

  useEffect(() => {
    if (acceptState.success) {
      setAcceptOpen(false);
      router.refresh();
    }
  }, [acceptState.success, router]);

  const viewerRoleLabel = viewerViewRole === "tutor" ? "Tutor" : "School admin";

  return (
    <>
      <div className="alert alert-warning border mb-2" role="status">
        <h2 className="h6 mb-2">Cancellation requested</h2>
        <p className="small mb-2">
          <span className="text-secondary">Requested in role ({initiatorRoleLabel}): </span>
          <span className="fw-semibold">{originatorDisplayName}</span>
        </p>
        {cancellationRequestComment ? (
          <p className="small mb-2">
            <span className="text-secondary">Comment: </span>
            {cancellationRequestComment}
          </p>
        ) : null}
        <p className="small text-secondary mb-2">
          You are viewing this page as <strong>{viewerRoleLabel}</strong> (use <strong>Choose role</strong> in the header
          to change).
        </p>
        {isCounterparty ? (
          <p className="small mb-0">
            <strong>{originatorDisplayName}</strong> asked to cancel this booking as <strong>{initiatorRoleLabel}</strong>.
            Use <strong>Respond</strong> to reply, or <strong>Accept cancellation</strong> to finalize (only the other
            party can accept — not the same role that submitted the request).
          </p>
        ) : (
          <p className="small mb-0">
            You started this request as <strong>{initiatorRoleLabel}</strong> while acting in that role. The other party
            (or your other role, if you use both hats on this booking) must accept to cancel. Use <strong>Respond</strong>{" "}
            to add context. You cannot accept your own request while still in the same role.
          </p>
        )}
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setRespondOpen(true)}>
          Respond
        </button>
        {isCounterparty ? (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setAcceptOpen(true)}
            aria-label={`Accept cancellation request from ${originatorDisplayName}`}
          >
            Accept cancellation
          </button>
        ) : null}
      </div>

      {respondOpen ? (
        <ModalBackdrop titleId={respondTitleId} onClose={() => setRespondOpen(false)}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form action={messageAction}>
                <div className="modal-header">
                  <h2 className="modal-title h5" id={respondTitleId}>
                    Respond to request from {originatorDisplayName}
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setRespondOpen(false)}
                  />
                </div>
                <div className="modal-body">
                  <input type="hidden" name="booking_id" value={bookingId} />
                  <label htmlFor={`${baseId}-respond-body`} className="form-label">
                    Your message
                  </label>
                  <textarea
                    id={`${baseId}-respond-body`}
                    name="body"
                    className="form-control"
                    rows={4}
                    required
                    placeholder="Reply to the other party about this cancellation request..."
                  />
                  {messageState.error ? (
                    <div className="text-danger small mt-2" role="alert">
                      {messageState.error}
                    </div>
                  ) : null}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setRespondOpen(false)}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Send response
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalBackdrop>
      ) : null}

      {acceptOpen && isCounterparty ? (
        <ModalBackdrop titleId={acceptTitleId} onClose={() => setAcceptOpen(false)}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form action={acceptAction}>
                <div className="modal-header">
                  <h2 className="modal-title h5" id={acceptTitleId}>
                    Accept cancellation from {originatorDisplayName}
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setAcceptOpen(false)}
                  />
                </div>
                <div className="modal-body">
                  <input type="hidden" name="booking_id" value={bookingId} />
                  <p className="small text-secondary">
                    You are accepting the cancellation request initiated by <strong>{originatorDisplayName}</strong> as{" "}
                    <strong>{initiatorRoleLabel}</strong>. This will cancel the booking and scheduled sessions. Optional
                    note for the thread:
                  </p>
                  <label htmlFor={`${baseId}-accept-note`} className="form-label">
                    Optional note
                  </label>
                  <textarea
                    id={`${baseId}-accept-note`}
                    name="note"
                    className="form-control"
                    rows={3}
                    placeholder="Optional message when accepting..."
                  />
                  {acceptState.error ? (
                    <div className="text-danger small mt-2" role="alert">
                      {acceptState.error}
                    </div>
                  ) : null}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setAcceptOpen(false)}>
                    Back
                  </button>
                  <button type="submit" className="btn btn-danger btn-sm">
                    Accept and cancel booking
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalBackdrop>
      ) : null}
    </>
  );
}
