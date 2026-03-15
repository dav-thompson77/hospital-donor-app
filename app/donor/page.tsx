import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { requireRole } from "@/lib/auth";
import { formatDate, formatDateTime, getDaysUntil } from "@/lib/utils";

const verificationLabels: Array<{ key: string; label: string }> = [
  { key: "registered", label: "Registered" },
  { key: "id_verified", label: "ID verified" },
  { key: "medical_screening_completed", label: "Medical screening completed" },
  { key: "haemoglobin_check_completed", label: "Haemoglobin check completed" },
  { key: "medical_interview_completed", label: "Medical interview completed" },
];

export default async function DonorDashboardPage() {
  const { supabase, profile } = await requireRole(["donor", "admin"]);

  const [donorProfileResult, verificationResult, appointmentsResult, alertsResult, responsesResult, donationsResult] =
    await Promise.all([
      supabase.from("donor_profiles").select("*").eq("profile_id", profile.id).maybeSingle(),
      supabase
        .from("donor_verification_steps")
        .select("*")
        .eq("donor_profile_id", profile.id)
        .maybeSingle(),
      supabase
        .from("appointments")
        .select("id, appointment_type, status, scheduled_at, blood_centres(name)")
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
    ]);

  const donorProfile = donorProfileResult.data;
  const verification = verificationResult.data;
  const appointments = appointmentsResult.data ?? [];
  const alerts = alertsResult.data ?? [];
  const responses = responsesResult.data ?? [];
  const totalDonations = donationsResult.count ?? 0;

  const responseByAlert = new Map<number, string>();
  for (const response of responses) {
    responseByAlert.set(response.alert_id, response.response_status);
  }

  const daysUntilNextEligible = getDaysUntil(donorProfile?.next_eligible_donation_date);

  return (
    <>
      <RealtimeRefresher donorProfileId={profile.id} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Current status</CardDescription>
            <CardTitle className="text-lg">
              <StatusBadge status={donorProfile?.status ?? "pending_verification"} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Blood type</CardDescription>
            <CardTitle>{donorProfile?.blood_type ?? "Unknown"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total donations</CardDescription>
            <CardTitle>{totalDonations}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Next eligible donation</CardDescription>
            <CardTitle className="text-base">
              {donorProfile?.next_eligible_donation_date
                ? `${formatDate(donorProfile.next_eligible_donation_date)}${
                    daysUntilNextEligible !== null ? ` (${daysUntilNextEligible} days)` : ""
                  }`
                : "Not available"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
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
                  <span className="text-sm">{step.label}</span>
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

        <Card>
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
                  <p className="text-sm text-muted-foreground">{formatDateTime(appointment.scheduled_at)}</p>
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

      <Card>
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
        </CardContent>
      </Card>
    </>
  );
}
