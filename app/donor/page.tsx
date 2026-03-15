import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { requireRole } from "@/lib/auth";
import { formatDate, formatDateTime, getDaysUntil } from "@/lib/utils";
import { CalendarClock, CheckCircle2, HeartPulse } from "lucide-react";

const DONATION_ELIGIBILITY_WINDOW_DAYS = 56;

function addDays(value: string, days: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function centreNameFromJoin(
  centre: { name: string } | Array<{ name: string }> | null | undefined,
) {
  if (!centre) {
    return "Unknown centre";
  }
  if (Array.isArray(centre)) {
    return centre[0]?.name ?? "Unknown centre";
  }
  return centre.name ?? "Unknown centre";
}

const verificationLabels: Array<{ key: string; label: string }> = [
  { key: "registered", label: "Registered" },
  { key: "id_verified", label: "ID verified" },
  { key: "medical_screening_completed", label: "Medical screening completed" },
  { key: "haemoglobin_check_completed", label: "Haemoglobin check completed" },
  { key: "medical_interview_completed", label: "Medical interview completed" },
];

export default async function DonorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ profileUpdated?: string }>;
}) {
  const params = await searchParams;
  const profileUpdated = params.profileUpdated === "1";
  const { supabase, profile } = await requireRole(["donor", "admin"]);

  const [
    donorProfileResult,
    verificationResult,
    appointmentsResult,
    alertsResult,
    responsesResult,
    donationsResult,
    recentDonationsResult,
    latestCompletedDonationResult,
  ] =
    await Promise.all([
      supabase.from("donor_profiles").select("*").eq("profile_id", profile.id).maybeSingle(),
      supabase
        .from("donor_verification_steps")
        .select("*")
        .eq("donor_profile_id", profile.id)
        .maybeSingle(),
      supabase
        .from("appointments")
        .select("id, appointment_type, status, scheduled_at, blood_centers(name)")
        .eq("donor_profile_id", profile.id)
        .order("scheduled_at", { ascending: true })
        .limit(4),
      supabase
        .from("donor_alerts")
        .select("id, message, created_at, blood_requests(blood_type_needed, urgency, required_by)")
        .eq("donor_profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("donor_alert_responses")
        .select("alert_id, response_status")
        .eq("donor_profile_id", profile.id),
      supabase
        .from("donation_history")
        .select("id", { count: "exact", head: true })
        .eq("donor_profile_id", profile.id),
      supabase
        .from("donation_history")
        .select("id, donated_at, blood_type, units, blood_centers(name)")
        .eq("donor_profile_id", profile.id)
        .order("donated_at", { ascending: false })
        .limit(3),
      supabase
        .from("appointments")
        .select("scheduled_at")
        .eq("donor_profile_id", profile.id)
        .eq("appointment_type", "donation")
        .eq("status", "completed")
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const donorProfile = donorProfileResult.data;
  const verification = verificationResult.data;
  const appointments = appointmentsResult.data ?? [];
  const alerts = alertsResult.data ?? [];
  const responses = responsesResult.data ?? [];
  const totalDonations = donationsResult.count ?? 0;
  const recentDonations = recentDonationsResult.data ?? [];
  const latestCompletedDonationDate = latestCompletedDonationResult.data?.scheduled_at ?? null;
  const nextEligibleDonationDate = latestCompletedDonationDate
    ? addDays(latestCompletedDonationDate, DONATION_ELIGIBILITY_WINDOW_DAYS)
    : null;

  const responseByAlert = new Map<number, string>();
  for (const response of responses) {
    responseByAlert.set(response.alert_id, response.response_status);
  }

  const daysUntilNextEligible = getDaysUntil(nextEligibleDonationDate);
  const eligibilityStatusText = !latestCompletedDonationDate
    ? "No completed donations yet"
    : daysUntilNextEligible !== null && daysUntilNextEligible > 0
      ? "Not yet eligible"
      : "Eligible again";

  return (
    <>
      <RealtimeRefresher donorProfileId={profile.id} />

      {profileUpdated ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Profile updated</AlertTitle>
          <AlertDescription>
            Your donor profile was saved successfully.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-primary/15">
          <CardHeader>
            <CardDescription>Current status</CardDescription>
            <CardTitle className="text-lg">
              <StatusBadge status={donorProfile?.status ?? "pending_verification"} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary/15">
          <CardHeader>
            <CardDescription>Blood type</CardDescription>
            <CardTitle>{donorProfile?.blood_type ?? "Unknown"}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary/15">
          <CardHeader>
            <CardDescription>Total donations</CardDescription>
            <CardTitle>{totalDonations}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary/15">
          <CardHeader>
            <CardDescription>Next eligible donation</CardDescription>
            <CardTitle className="text-base">
              {nextEligibleDonationDate
                ? `${formatDate(nextEligibleDonationDate)}${
                    daysUntilNextEligible !== null
                      ? daysUntilNextEligible > 0
                        ? ` (${daysUntilNextEligible} days)`
                        : " (eligible now)"
                      : ""
                  }`
                : "No completed donations yet"}
            </CardTitle>
            <CardDescription>{eligibilityStatusText}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Alert className="border-primary/20 bg-accent/40">
        <HeartPulse className="h-4 w-4 text-primary" />
        <AlertTitle>Official screening workflow</AlertTitle>
        <AlertDescription>
          Your dashboard helps track progress, but final donation approval is
          completed by qualified medical staff.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-primary/15">
          <CardHeader>
            <CardTitle>Eligibility tracker</CardTitle>
            <CardDescription>
              Blood Bridge supports official screening. Approval is finalized by clinical staff.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {verificationLabels.map((step) => {
              const done = Boolean((verification as Record<string, boolean> | null)?.[step.key]);
              return (
                <div key={step.key} className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm text-foreground/90">{step.label}</span>
                  <StatusBadge status={done ? "booked" : "pending"} />
                </div>
              );
            })}
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm">Outcome</span>
              <StatusBadge
                status={verification?.approval_outcome ?? donorProfile?.status ?? "pending_verification"}
              />
            </div>
            <Button asChild className="w-full">
              <Link href="/donor/profile">Update profile details</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/15">
          <CardHeader>
            <CardTitle>Upcoming appointments</CardTitle>
            <CardDescription>Your next blood typing, screening, and donation slots.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments.length ? (
              appointments.map((appointment) => (
                <div key={appointment.id} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">{appointment.appointment_type.replaceAll("_", " ")}</p>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <p className="text-sm text-foreground/70">{formatDateTime(appointment.scheduled_at)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No appointments yet. Book your first slot.</p>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/donor/appointments">Manage appointments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/15">
        <CardHeader>
          <CardTitle>Recent donation history</CardTitle>
          <CardDescription>Most recent completed donation records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentDonations.length ? (
            recentDonations.map((donation) => (
              <div key={donation.id} className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {donation.blood_type} • {donation.units} unit
                    {Number(donation.units) === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {centreNameFromJoin(donation.blood_centers)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Completed {formatDateTime(donation.donated_at)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No donation records yet.</p>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/donor/donations">Open full donation history</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/15">
        <CardHeader>
          <CardTitle>Recent alerts</CardTitle>
          <CardDescription>Respond quickly so staff can coordinate supply.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length ? (
            alerts.map((alert) => (
              <div key={alert.id} className="rounded-md border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <StatusBadge status={responseByAlert.get(alert.id) ?? "pending"} />
                </div>
                <p className="text-xs text-muted-foreground">Sent {formatDateTime(alert.created_at)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No alerts yet.</p>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/donor/alerts">Open alerts</Link>
          </Button>
          <Separator />
          <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <p className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              Next date guidance shown automatically
            </p>
            <p className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Keep profile details current for outreach
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
