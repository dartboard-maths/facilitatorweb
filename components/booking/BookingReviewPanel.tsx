"use client";

import { useFormState } from "react-dom";
import { markBookingCompleted } from "../../app/bookings/lifecycle-actions";
import { submitBookingReview, type ReviewActionState } from "../../app/reviews/actions";

const initialReview: ReviewActionState = {};
const initialLifecycle: { error?: string; success?: string } = {};

type BookingReviewPanelProps = {
  bookingId: string;
  /** booking.status normalized lower */
  bookingStatus: string;
  /** Full name of the other party (the person you are rating). */
  otherPartyDisplayName: string;
  canAct: boolean;
  myReview: {
    rating: number;
    recommendation_text: string | null;
    moderation_status: string;
    public_visible: boolean;
  } | null;
  partnerHasReview: boolean;
};

export function BookingReviewPanel({
  bookingId,
  bookingStatus,
  otherPartyDisplayName,
  canAct,
  myReview,
  partnerHasReview,
}: BookingReviewPanelProps) {
  const [reviewState, reviewAction] = useFormState(submitBookingReview, initialReview);
  const [completeState, completeAction] = useFormState(markBookingCompleted, initialLifecycle);

  const showMarkComplete = canAct && (bookingStatus === "accepted" || bookingStatus === "confirmed");
  const showReviewForm =
    canAct &&
    !myReview &&
    (bookingStatus === "completed" || bookingStatus === "cancelled");

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body p-3">
        <h2 className="h6 mb-2">Reviews</h2>
        <p className="small text-secondary mb-3">
          Please rate your interaction with <strong>{otherPartyDisplayName}</strong>. Ratings are shared publicly only
          after <strong>both</strong> the tutor and school admin have submitted approved reviews for this booking.
        </p>

        {showMarkComplete && (
          <form action={completeAction} className="mb-3 p-3 border rounded bg-light-subtle">
            <input type="hidden" name="booking_id" value={bookingId} />
            <p className="small mb-2">
              When the programme or lesson is finished, mark this booking complete so both parties can leave a review.
            </p>
            <button type="submit" className="btn btn-outline-primary btn-sm">
              Mark booking complete
            </button>
            {completeState.error ? (
              <div className="text-danger small mt-2" role="alert">
                {completeState.error}
              </div>
            ) : null}
            {completeState.success ? (
              <div className="text-success small mt-2" role="status">
                {completeState.success}
              </div>
            ) : null}
          </form>
        )}

        {myReview ? (
          <div className="small">
            <p className="mb-1">
              <strong>Your review:</strong> {myReview.rating}/5
              {myReview.moderation_status !== "approved" ? (
                <span className="badge text-bg-warning ms-2">Pending moderation</span>
              ) : null}
            </p>
            {myReview.recommendation_text ? (
              <p className="mb-1 text-secondary">{myReview.recommendation_text}</p>
            ) : null}
            <p className="mb-0 text-secondary">
              {myReview.public_visible
                ? "Your review is visible on public profiles (pair complete)."
                : partnerHasReview
                  ? "Waiting for moderation or pair visibility sync."
                  : "Waiting for the other party to submit their review before public display."}
            </p>
          </div>
        ) : null}

        {showReviewForm ? (
          <form action={reviewAction} className="mt-2">
            <input type="hidden" name="booking_id" value={bookingId} />
            <div className="mb-2">
              <label className="form-label small" htmlFor={`rating-${bookingId}`}>
                Rating (1–5)
              </label>
              <select
                id={`rating-${bookingId}`}
                name="rating"
                className="form-select form-select-sm"
                required
                defaultValue="5"
              >
                <option value="5">5 — Excellent</option>
                <option value="4">4 — Good</option>
                <option value="3">3 — OK</option>
                <option value="2">2 — Poor</option>
                <option value="1">1 — Very poor</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="form-label small" htmlFor={`rec-${bookingId}`}>
                Recommendation / feedback (optional)
              </label>
              <textarea
                id={`rec-${bookingId}`}
                name="recommendation_text"
                className="form-control form-control-sm"
                rows={3}
                maxLength={2000}
                placeholder="What went well? What could improve?"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Submit review
            </button>
            {reviewState.error ? (
              <div className="text-danger small mt-2" role="alert">
                {reviewState.error}
              </div>
            ) : null}
            {reviewState.success ? (
              <div className="text-success small mt-2" role="status">
                {reviewState.success}
              </div>
            ) : null}
          </form>
        ) : null}

        {!canAct && !myReview ? (
          <p className="small text-secondary mb-0">Sign in as a participant to leave a review.</p>
        ) : null}
      </div>
    </div>
  );
}
