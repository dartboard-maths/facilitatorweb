import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingRequestForm } from "../../../components/booking/BookingRequestForm";
import { createBookingRequest } from "./actions";
import { getMarketplaceSession } from "../../../lib/auth/session";
import { createAdminClient } from "../../../lib/supabase/admin";

type NewBookingPageProps = {
  searchParams?: {
    tutorId?: string;
  };
};

type AvailabilityRuleRow = {
  weekday: number;
  start_time: string;
  end_time: string;
  recurrence_start_date: string | null;
  recurrence_end_date: string | null;
};

type AvailabilityOverrideRow = {
  override_date: string;
  is_available: boolean;
};

export default async function NewBookingPage({ searchParams }: NewBookingPageProps) {
  const session = await getMarketplaceSession();
  if (!session) {
    redirect("/sign-in?next=/bookings/new");
  }
  if (!session.isSchoolAdmin) {
    redirect("/tutors");
  }
  if (!session.managedSchoolIds.length) {
    return (
      <main className="container py-5">
        <div className="alert alert-warning" role="alert">
          Your account does not have any managed school ids assigned yet.
        </div>
        <Link href="/tutors" className="btn btn-outline-primary">
          Back to tutors
        </Link>
      </main>
    );
  }

  const tutorId = (searchParams?.tutorId ?? "").trim();
  if (!tutorId) {
    return (
      <main className="container py-5">
        <div className="alert alert-danger" role="alert">
          Missing tutor id for booking request.
        </div>
        <Link href="/tutors" className="btn btn-outline-primary">
          Back to tutors
        </Link>
      </main>
    );
  }

  const supabase = createAdminClient();
  const { data: tutorRow } = await supabase
    .from("tutors")
    .select("user_id,name")
    .eq("id", tutorId)
    .maybeSingle();

  if (!tutorRow) {
    return (
      <main className="container py-5">
        <div className="alert alert-danger" role="alert">
          Tutor not found.
        </div>
        <Link href="/tutors" className="btn btn-outline-primary">
          Back to tutors
        </Link>
      </main>
    );
  }

  const { data: availabilityRows } = await supabase
    .from("tutor_availability_rules")
    .select("weekday,start_time,end_time,recurrence_start_date,recurrence_end_date")
    .eq("tutor_user_id", tutorRow.user_id)
    .eq("is_active", true)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });
  const availabilityRules = (availabilityRows ?? []) as AvailabilityRuleRow[];

  const { data: overrideRows } = await supabase
    .from("tutor_availability_overrides")
    .select("override_date,is_available")
    .eq("tutor_user_id", tutorRow.user_id)
    .eq("is_available", false);
  const blockedDates = ((overrideRows ?? []) as AvailabilityOverrideRow[])
    .map((row) => row.override_date)
    .filter(Boolean);

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <BookingRequestForm
            action={createBookingRequest}
            tutorUserId={tutorRow.user_id}
            tutorName={tutorRow.name}
            schoolIds={session.managedSchoolIds}
            availabilityRules={availabilityRules.map((rule) => ({
              weekday: rule.weekday,
              startTime: String(rule.start_time).slice(0, 5),
              endTime: String(rule.end_time).slice(0, 5),
              recurrenceStartDate: rule.recurrence_start_date,
              recurrenceEndDate: rule.recurrence_end_date,
            }))}
            blockedDates={blockedDates}
          />
          <div className="mt-3">
            <Link href="/tutors" className="btn btn-link ps-0">
              ← Back to tutors
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

