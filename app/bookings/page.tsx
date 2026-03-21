import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingInbox, type BookingInboxItem } from "../../components/booking/BookingInbox";
import { getMarketplaceSession } from "../../lib/auth/session";
import { createAdminClient } from "../../lib/supabase/admin";

type BookingsPageProps = {
  searchParams?: {
    status?: string;
  };
};

const ALLOWED_STATUSES = new Set(["pending", "changes_requested", "accepted", "declined"]);

type BookingRow = {
  id: string;
  status: string;
  booking_type: string;
  school_id: string;
  tutor_user_id: string;
  school_admin_user_id: string;
  created_at: string;
  last_activity_at: string | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function displayName(user: UserRow | undefined): string {
  if (!user) return "Unknown user";
  return user.full_name?.trim() || user.email?.trim() || "Unknown user";
}

export default async function BookingsInboxPage({ searchParams }: BookingsPageProps) {
  const session = await getMarketplaceSession();
  if (!session) {
    redirect("/sign-in?next=/bookings");
  }

  const statusParam = String(searchParams?.status ?? "pending").toLowerCase();
  const activeStatus = ALLOWED_STATUSES.has(statusParam) ? statusParam : "pending";

  const supabase = createAdminClient();
  const isTutorView = !session.isSchoolAdmin;
  let bookingQuery = supabase
    .from("bookings")
    .select("id,status,booking_type,school_id,tutor_user_id,school_admin_user_id,created_at,last_activity_at")
    .eq("status", activeStatus)
    .order("last_activity_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (isTutorView) {
    bookingQuery = bookingQuery.eq("tutor_user_id", session.sub);
  } else if (session.managedSchoolIds.length > 0) {
    bookingQuery = bookingQuery.in("school_id", session.managedSchoolIds);
  } else {
    bookingQuery = bookingQuery.eq("school_admin_user_id", session.sub);
  }

  const { data: bookingRows, error: bookingError } = await bookingQuery;
  if (bookingError) {
    return (
      <main className="container py-5">
        <div className="alert alert-danger" role="alert">
          {bookingError.message}
        </div>
      </main>
    );
  }

  const bookings = (bookingRows ?? []) as BookingRow[];
  const userIds = Array.from(
    new Set(bookings.flatMap((item) => [item.tutor_user_id, item.school_admin_user_id]).filter(Boolean)),
  );
  const { data: userRows } = userIds.length
    ? await supabase.from("users").select("id,full_name,email").in("id", userIds)
    : { data: [] };
  const usersById = new Map((userRows ?? []).map((row) => [row.id, row as UserRow]));

  const items: BookingInboxItem[] = bookings.map((row) => ({
    id: row.id,
    status: row.status,
    bookingType: row.booking_type,
    schoolId: row.school_id,
    tutorName: displayName(usersById.get(row.tutor_user_id)),
    schoolAdminName: displayName(usersById.get(row.school_admin_user_id)),
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at ?? row.created_at,
  }));

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
        <div>
          <h1 className="h3 mb-1">Bookings</h1>
          <p className="text-secondary mb-0">
            {isTutorView ? "Review booking requests from schools." : "Review and manage school booking requests."}
          </p>
        </div>
        <Link href="/role-select" className="btn btn-outline-secondary btn-sm">
          Back to roles
        </Link>
      </div>

      <BookingInbox role={isTutorView ? "tutor" : "school_admin"} activeStatus={activeStatus} items={items} />
    </main>
  );
}
