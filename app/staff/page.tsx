import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { getStaffDashboardData } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Activity, Building2, UsersRound, BrainCircuit } from "lucide-react";

function centreNameFromJoin(
  centre: { name: string } | Array<{ name: string }> | null | undefined,
) {
  if (!centre) return "Unknown centre";
  if (Array.isArray(centre)) return centre[0]?.name ?? "Unknown centre";
  return centre.name ?? "Unknown centre";
}

function alertMessageFromJoin(
  donorAlerts:
    | { message: string | null }
    | Array<{ message: string | null }>
    | null
    | undefined,
) {
  if (!donorAlerts) return "Alert response";
  if (Array.isArray(donorAlerts)) return donorAlerts[0]?.message ?? "Alert response";
  return donorAlerts.message ?? "Alert response";
}

export default async function StaffDashboardPage() {
  const { supabase } = await requireRole(["blood_bank_staff", "admin"]);

  const [analytics, requestsResult, responsesResult] = await Promise.all([
    getStaffDashboardData(supabase),
    supabase
      .from("blood_requests")
      .select("id, blood_type_needed, urgency, required_by, status, blood_centers(name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("donor_alert_responses")
      .select("id, response_status, responded_at, donor_profile_id, donor_alerts(message)")
      .neq("response_status", "pending")
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const requests = requestsResult.data ?? [];
  const responses = responsesResult.data ?? [];

  return (
    <>
      <RealtimeRefresher watchStaffResponses />

      {/* Stats strip */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-primary/15">
          <CardHeader>
            <CardDescription>Active requests</CardDescription>
            <CardTitle>{analytics.activeRequests}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary/15">
          <CardHeader>
            <CardDescription>Approved donors</CardDescription>
            <CardTitle>{analytics.approvedDonors}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary/15">
          <CardHeader>
            <CardDescription>Pending verification</CardDescription>
            <CardTitle>{analytics.pendingVerification}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary/15">
          <CardHeader>
            <CardDescription>Booked appointments</CardDescription>
            <CardTitle>{analytics.bookedAppointments}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary/15">
          <CardHeader>
            <CardDescription>Responses received</CardDescription>
            <CardTitle>{analytics.responsesReceived}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* AI Monitor Card */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/20">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <h3 className="font-bold text-red-700 dark:text-red-400">
            AI Inventory Monitor
          </h3>
          <span className="ml-auto rounded-full border border-red-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            Auto-runs every hour
          </span>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Continuously monitors blood type inventory, consumption rates, and
          real-world trends. Proactively detects when a specific blood type is
          approaching a critical threshold and instantly alerts matching eligible
          donors before a crisis hits.
        </p>
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            🚗 Road accident spikes
          </span>
          <span className="flex items-center gap-1">
            🤰 Prenatal admission trends
          </span>
          <span className="flex items-center gap-1">
            🏥 Surgical volume patterns
          </span>
          <span className="flex items-center gap-1">
            📊 Consumption rate tracking
          </span>
        </div>
        <Button
          asChild
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Link
            href="/staff/monitor"
            target="_blank"
          >
            <BrainCircuit className="mr-2 h-4 w-4" />
            View AI monitor
          </Link>
        </Button>
      </div>

      <Alert className="border-primary/20 bg-accent/45">
        <Building2 className="h-4 w-4 text-primary" />
        <AlertTitle>Coordination view</AlertTitle>
        <AlertDescription>
          Monitor demand, target matching donors, and keep appointment pipelines
          moving across hospital and blood service teams.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-primary/15">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active blood requests</CardTitle>
              <CardDescription>Live demand from blood centres.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/staff/requests">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.length ? (
              requests.map((request) => (
                <div key={request.id} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">
                      {request.blood_type_needed} at{" "}
                      {centreNameFromJoin(request.blood_centers)}
                    </p>
                    <StatusBadge status={request.urgency} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"></div>
                    <span>Required by {formatDate(request.required_by)}</span>
                    <span>•</span>
                    <StatusBadge status={request.status} />
                  </div> 
               
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No blood requests yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/15">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Latest donor responses</CardTitle>
              <CardDescription>Realtime incoming alert responses.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/staff/alerts">Open alerts</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {responses.length ? (
              responses.map((response) => (
                <div key={response.id} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm">
                      {alertMessageFromJoin(response.donor_alerts)}
                    </p>
                    <StatusBadge status={response.response_status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Responded {formatDateTime(response.responded_at)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No responses yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-primary/15">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Real-time operations</p>
              <p className="text-xs text-muted-foreground">
                Live responses and appointment statuses refresh without manual
                reload.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/15">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <UsersRound className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Targeted donor outreach</p>
              <p className="text-xs text-muted-foreground">
                Filter by eligibility, parish, and blood type before sending
                alerts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}