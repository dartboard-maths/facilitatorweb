"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState } from "react-dom";
import type { BookingActionState } from "../../app/bookings/actions";
import { cancelUnacceptedBooking } from "../../app/bookings/unaccepted-booking-cancel-actions";

const initialState: BookingActionState = {};

type BookingImmediateCancelButtonProps = {
  bookingId: string;
};

export function BookingImmediateCancelButton({ bookingId }: BookingImmediateCancelButtonProps) {
  const router = useRouter();
  const [state, formAction] = useFormState(cancelUnacceptedBooking, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      action={formAction}
      className="d-inline"
      onSubmit={(e) => {
        if (!window.confirm("Cancel this booking immediately? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="booking_id" value={bookingId} />
      <button type="submit" className="btn btn-outline-danger btn-sm">
        Cancel booking
      </button>
      {state.error ? (
        <span className="text-danger small ms-2" role="alert">
          {state.error}
        </span>
      ) : null}
      {state.success ? (
        <span className="text-success small ms-2" role="status">
          {state.success}
        </span>
      ) : null}
    </form>
  );
}
