"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { BookingActionState } from "../../app/bookings/actions";
import { formatBookingDateTime } from "../../lib/datetime/booking-display";

type BookingThreadMessage = {
  id: string;
  senderRole: string;
  body: string;
  createdAt: string;
};

type BookingThreadProps = {
  bookingId: string;
  messages: BookingThreadMessage[];
  canPost: boolean;
  action: (state: BookingActionState, payload: FormData) => Promise<BookingActionState>;
};

const initialState: BookingActionState = {};

function MessageSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
      {pending ? "Sending..." : "Send"}
    </button>
  );
}

function roleLabel(value: string): string {
  if (value === "school_admin") return "School admin";
  if (value === "tutor") return "Tutor";
  return "System";
}

export function BookingThread({ bookingId, messages, canPost, action }: BookingThreadProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <section className="card border-0 shadow-sm">
      <div className="card-body p-3">
        <h2 className="h6 mb-3">Conversation</h2>

        {messages.length === 0 ? (
          <div className="small text-secondary mb-3">No messages yet.</div>
        ) : (
          <div className="d-grid gap-2 mb-3">
            {messages.map((message) => (
              <div key={message.id} className="border rounded p-2 bg-light-subtle">
                <div className="small text-secondary mb-1">
                  <span className="fw-semibold">{roleLabel(message.senderRole)}</span> •{" "}
                  {formatBookingDateTime(message.createdAt)}
                </div>
                <div className="small">{message.body}</div>
              </div>
            ))}
          </div>
        )}

        {canPost ? (
          <form action={formAction}>
            <input type="hidden" name="booking_id" value={bookingId} />
            <label htmlFor="thread-body" className="form-label mb-1">
              Reply
            </label>
            <textarea
              id="thread-body"
              name="body"
              className="form-control"
              rows={3}
              placeholder="Write a message..."
              required
            />
            <div className="mt-2 d-flex align-items-center gap-2">
              <MessageSubmitButton />
              {state.error && (
                <span className="text-danger small" role="alert">
                  {state.error}
                </span>
              )}
              {state.success && (
                <span className="text-success small" role="status">
                  {state.success}
                </span>
              )}
            </div>
          </form>
        ) : (
          <div className="small text-secondary">You do not have permission to post to this thread.</div>
        )}
      </div>
    </section>
  );
}
