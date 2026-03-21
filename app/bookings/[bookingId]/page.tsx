import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingDecisionBar } from "../../../components/booking/BookingDecisionBar";
import { SchoolLocationCard } from "../../../components/booking/SchoolLocationCard";
import { BookingSessionsView } from "../../../components/booking/BookingSessionsView";
import { BookingThread } from "../../../components/booking/BookingThread";
import { postBookingMessage, submitBookingDecision } from "../actions";
import { getMarketplaceSession } from "../../../lib/auth/session";
import { createAdminClient } from "../../../lib/supabase/admin";
import { resolveSchoolLocationForBooking } from "../../../lib/schools/school-location";

type BookingDetailPageProps = {
  params: {
    bookingId: string;
  };
};

type BookingRow = {
  id: string;
  status: string;
  booking_type: string;
  school_id: string;
  school_snapshot: unknown | null;
  tutor_user_id: string;
  school_admin_user_id: string;
  requested_timezone: string;
  notes: string | null;
  programme_start_date: string | null;
  programme_end_date: string | null;
  created_at: string;
};

type SessionRow = {
  id: string;
  session_start: string;
  session_end: string;
  status: string;
};

type MessageRow = {
  id: string;
  sender_role: string;
  body: string;
  created_at: string;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function displayName(user: UserRow | null): string {
  if (!user) return "Unknown user";
  return user.full_name?.trim() || user.email?.trim() || "Unknown user";
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const session = await getMarketplaceSession();
  if (!session) {
    redirect(`/sign-in?next=/bookings/${encodeURIComponent(params.bookingId)}`);
  }

  const bookingId = params.bookingId?.trim();
  if (!bookingId) {
    redirect("/bookings");
  }

  const supabase = createAdminClient();
  let bookingQuery = await supabase
    .from("bookings")
    .select(
      "id,status,booking_type,school_id,school_snapshot,tutor_user_id,school_admin_user_id,requested_timezone,notes,programme_start_date,programme_end_date,created_at",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (
    bookingQuery.error &&
    /school_snapshot|schema cache|column/i.test(bookingQuery.error.message ?? "")
  ) {
    bookingQuery = await supabase
      .from("bookings")
      .select(
        "id,status,booking_type,school_id,tutor_user_id,school_admin_user_id,requested_timezone,notes,programme_start_date,programme_end_date,created_at",
      )
      .eq("id", bookingId)
      .maybeSingle();
  }

  const bookingData = bookingQuery.data as (BookingRow & { school_snapshot?: unknown }) | null;
  const bookingError = bookingQuery.error;

  if (bookingError || !bookingData) {
    return (
      <main className="container py-5">
        <div className="alert alert-danger" role="alert">
          {bookingError?.message ?? "Booking not found."}
        </div>
        <Link href="/bookings" className="btn btn-outline-primary">
          Back to bookings
        </Link>
      </main>
    );
  }

  const booking = {
    ...bookingData,
    school_snapshot: (bookingData as { school_snapshot?: unknown }).school_snapshot ?? null,
  } as BookingRow;

  const schoolLookup = await supabase
    .from("schools")
    .select(
      "id,name,address_line1,address_line2,suburb,city,state,postcode,country,latitude,longitude",
    )
    .eq("id", booking.school_id)
    .maybeSingle();
  const schoolCatalogRow =
    !schoolLookup.error && schoolLookup.data ? (schoolLookup.data as Record<string, unknown>) : null;

  const { data: schoolForDisplay, source: schoolDisplaySource } = resolveSchoolLocationForBooking({
    schoolSnapshot: booking.school_snapshot,
    catalogRow: schoolCatalogRow,
    schoolId: booking.school_id,
  });

  const isTutor = session.sub === booking.tutor_user_id;
  const isSchoolAdminForBooking =
    session.isSchoolAdmin &&
    (session.sub === booking.school_admin_user_id || session.managedSchoolIds.includes(booking.school_id));
  if (!isTutor && !isSchoolAdminForBooking) {
    redirect("/bookings");
  }

  const { data: sessionsData } = await supabase
    .from("booking_sessions")
    .select("id,session_start,session_end,status")
    .eq("booking_id", booking.id)
    .order("session_start", { ascending: true });
  const bookingSessions = (sessionsData ?? []) as SessionRow[];

  const userIds = [booking.tutor_user_id, booking.school_admin_user_id];
  const { data: userRows } = await supabase.from("users").select("id,full_name,email").in("id", userIds);
  const userMap = new Map((userRows ?? []).map((row) => [row.id, row as UserRow]));

  let threadUnavailableReason: string | null = null;
  let messages: MessageRow[] = [];
  const { data: messageRows, error: messageError } = await supabase
    .from("booking_messages")
    .select("id,sender_role,body,created_at")
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: true });
  if (messageError) {
    if (/booking_messages/i.test(messageError.message)) {
      threadUnavailableReason = "Booking conversation is not available until migration 015 is applied.";
    } else {
      threadUnavailableReason = messageError.message;
    }
  } else {
    messages = (messageRows ?? []) as MessageRow[];
  }

  const canDecide = isTutor || isSchoolAdminForBooking;

  return (
    <main className="container py-5">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        <Link href="/" className="btn btn-link px-0">
          Home
        </Link>
        <Link href="/tutors" className="btn btn-link px-0">
          Tutors
        </Link>
        <Link href="/bookings" className="btn btn-link px-0">
          Bookings
        </Link>
        <div className="ms-auto d-flex align-items-center gap-2">
          <Link href="/role-select" className="btn btn-outline-secondary btn-sm">
            Choose role
          </Link>
          <form action="/api/auth/sign-out" method="post">
            <button type="submit" className="btn btn-outline-secondary btn-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Booking detail</h1>
        <Link href="/bookings" className="btn btn-outline-secondary btn-sm">
          Back to inbox
        </Link>
      </div>

      <SchoolLocationCard
        school={schoolForDisplay}
        fallbackSchoolId={booking.school_id}
        displaySource={schoolDisplaySource}
      />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="small text-secondary">Tutor</div>
              <div className="fw-semibold">{displayName(userMap.get(booking.tutor_user_id) ?? null)}</div>
            </div>
            <div className="col-12 col-md-6">
              <div className="small text-secondary">School admin</div>
              <div className="fw-semibold">{displayName(userMap.get(booking.school_admin_user_id) ?? null)}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="small text-secondary">Status</div>
              <div className="text-capitalize">{booking.status.replace(/_/g, " ")}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="small text-secondary">Type</div>
              <div>{booking.booking_type === "programme_block" ? "Programme block" : "Single lesson"}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="small text-secondary">Timezone</div>
              <div>{booking.requested_timezone}</div>
            </div>
            {booking.booking_type === "programme_block" && (
              <div className="col-12">
                <div className="small text-secondary">Programme range</div>
                <div>
                  {(booking.programme_start_date ?? "?") + " to " + (booking.programme_end_date ?? "?")}
                </div>
              </div>
            )}
            {booking.notes && (
              <div className="col-12">
                <div className="small text-secondary">Request notes</div>
                <div>{booking.notes}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <h2 className="h6 mb-2">Sessions</h2>
          {bookingSessions.length === 0 ? (
            <div className="small text-secondary">No sessions attached to this booking.</div>
          ) : (
            <BookingSessionsView
              sessions={bookingSessions.map((row) => ({
                id: row.id,
                sessionStart: row.session_start,
                sessionEnd: row.session_end,
                status: row.status,
              }))}
            />
          )}
        </div>
      </div>

      <div className="mb-3">
        <BookingDecisionBar
          bookingId={booking.id}
          canDecide={canDecide}
          currentStatus={booking.status}
          action={submitBookingDecision}
        />
      </div>

      {threadUnavailableReason ? (
        <div className="alert alert-warning" role="alert">
          {threadUnavailableReason}
        </div>
      ) : (
        <BookingThread
          bookingId={booking.id}
          messages={messages.map((item) => ({
            id: item.id,
            senderRole: item.sender_role,
            body: item.body,
            createdAt: item.created_at,
          }))}
          canPost={canDecide}
          action={postBookingMessage}
        />
      )}
    </main>
  );
}
