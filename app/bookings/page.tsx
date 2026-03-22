import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingInbox, type BookingInboxItem } from "../../components/booking/BookingInbox";
import { getMarketplaceSession } from "../../lib/auth/session";
import { getMarketplaceViewRoleFromCookies, resolveInboxViewRole } from "../../lib/auth/view-role";
import { createAdminClient } from "../../lib/supabase/admin";

type BookingsPageProps = {
  searchParams?: {
    status?: string;
  };
};

const ALLOWED_STATUSES = new Set([
  "all",
  "pending",
  "changes_requested",
  "accepted",
  "declined",
  "cancellation_requested",
  "cancelled",
]);

/** In-workshop / live commitments — listed first on "All". */
const ACTIVE_STATUSES = new Set(["accepted", "confirmed"]);
const CANCELLED_STATUS = "cancelled";

function sortByRecentActivity(a: BookingRow, b: BookingRow): number {
  const ta = new Date(a.last_activity_at ?? a.created_at).getTime();
  const tb = new Date(b.last_activity_at ?? b.created_at).getTime();
  return tb - ta;
}

function partitionBookingsForAllView(rows: BookingRow[]): {
  active: BookingRow[];
  other: BookingRow[];
  cancelled: BookingRow[];
} {
  const active: BookingRow[] = [];
  const other: BookingRow[] = [];
  const cancelled: BookingRow[] = [];
  for (const row of rows) {
    const s = row.status.trim().toLowerCase();
    if (ACTIVE_STATUSES.has(s)) {
      active.push(row);
    } else if (s === CANCELLED_STATUS) {
      cancelled.push(row);
    } else {
      other.push(row);
    }
  }
  active.sort(sortByRecentActivity);
  other.sort(sortByRecentActivity);
  cancelled.sort(sortByRecentActivity);
  return { active, other, cancelled };
}

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

  const statusParam = String(searchParams?.status ?? "all").toLowerCase();
  const activeStatus = ALLOWED_STATUSES.has(statusParam) ? statusParam : "all";

  const supabase = createAdminClient();

  const { data: tutorRow } = await supabase
    .from("tutors")
    .select("id")
    .eq("user_id", session.sub)
    .maybeSingle();
  const hasTutorProfile = Boolean(tutorRow);
  const cookieRole = await getMarketplaceViewRoleFromCookies();
  const inboxViewRole = resolveInboxViewRole(session, { hasTutorProfile, cookieRole });
  const isTutorView = inboxViewRole === "tutor";

  const baseBookingsQuery = () => {
    let q = supabase
      .from("bookings")
      .select("id,status,booking_type,school_id,tutor_user_id,school_admin_user_id,created_at,last_activity_at")
      .order("last_activity_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (activeStatus !== "all") {
      q = q.eq("status", activeStatus);
    }

    if (isTutorView) {
      q = q.eq("tutor_user_id", session.sub);
    } else if (session.managedSchoolIds.length > 0) {
      q = q.in("school_id", session.managedSchoolIds);
    } else {
      q = q.eq("school_admin_user_id", session.sub);
    }
    return q;
  };

  const { data: bookingRows, error: bookingError } = await baseBookingsQuery();
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

  const rowToItem = (row: BookingRow): BookingInboxItem => ({
    id: row.id,
    status: row.status,
    bookingType: row.booking_type,
    schoolId: row.school_id,
    tutorName: displayName(usersById.get(row.tutor_user_id)),
    schoolAdminName: displayName(usersById.get(row.school_admin_user_id)),
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at ?? row.created_at,
  });

  const items: BookingInboxItem[] = bookings.map(rowToItem);

  const grouped =
    activeStatus === "all"
      ? (() => {
          const { active, other, cancelled } = partitionBookingsForAllView(bookings);
          return {
            active: active.map(rowToItem),
            other: other.map(rowToItem),
            cancelled: cancelled.map(rowToItem),
          };
        })()
      : null;

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

      <BookingInbox
        role={isTutorView ? "tutor" : "school_admin"}
        activeStatus={activeStatus}
        items={items}
        grouped={grouped}
      />
    </main>
  );
}
