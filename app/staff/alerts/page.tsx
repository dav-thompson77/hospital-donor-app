import { sendAlertAction } from "@/app/actions/staff";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

function getNameFromJoin(
  profiles:
    | { full_name: string | null }
    | Array<{ full_name: string | null }>
    | null
    | undefined,
) {
  if (!profiles) {
    return "Unknown donor";
  }
  if (Array.isArray(profiles)) {
    return profiles[0]?.full_name ?? "Unknown donor";
  }
  return profiles.full_name ?? "Unknown donor";
}

export default async function StaffAlertsPage() {
  const { supabase } = await requireRole(["blood_bank_staff", "admin"]);

  const [requestsResult, donorsResult, alertsResult, responsesResult] = await Promise.all([
    supabase
      .from("blood_requests")
      .select("id, blood_type_needed, urgency, required_by, status")
      .eq("status", "active")
      .order("required_by", { ascending: true }),
    supabase
      .from("donor_profiles")
      .select("profile_id, blood_type, status, profiles!inner(full_name)")
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("donor_alerts")
      .select(
        "id, message, created_at, donor_profile_id, blood_requests(id, blood_type_needed, urgency), donor_profiles(profile_id, profiles(full_name))",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("donor_alert_responses")
      .select("id, alert_id, donor_profile_id, response_status, responded_at, note")
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  const requests = requestsResult.data ?? [];
  const donors = donorsResult.data ?? [];
  const alerts = alertsResult.data ?? [];
  const responses = responsesResult.data ?? [];

  const responsesByAlert = new Map<number, (typeof responses)>();
  for (const response of responses) {
    const list = responsesByAlert.get(response.alert_id) ?? [];
    list.push(response);
    responsesByAlert.set(response.alert_id, list);
  }

  return (
    <>
      <RealtimeRefresher watchStaffResponses />

      <Card>
        <CardHeader>
          <CardTitle>Send donor alert</CardTitle>
          <CardDescription>
            Send to one donor or leave donor empty to broadcast to matching approved donors for the request blood type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={sendAlertAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="blood_request_id">Blood request</Label>
              <select
                id="blood_request_id"
                name="blood_request_id"
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">Select request</option>
                {requests.map((request) => (
                  <option key={request.id} value={request.id}>
                    #{request.id} {request.blood_type_needed} ({request.urgency})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="donor_profile_id">Specific donor (optional)</Label>
              <select
                id="donor_profile_id"
                name="donor_profile_id"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">Broadcast to matching approved donors</option>
                {donors.map((donor) => (
                  <option key={donor.profile_id} value={donor.profile_id}>
                    {getNameFromJoin(donor.profiles)} • {donor.blood_type ?? "unknown"} • {donor.status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="message">Alert message</Label>
              <Textarea
                id="message"
                name="message"
                required
                placeholder="Urgent request: are you available to donate in the next 24 hours?"
              />
            </div>
            <Button type="submit" className="md:col-span-2">
              Send alert
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert response tracker</CardTitle>
          <CardDescription>Realtime updates from donor responses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.length ? (
            alerts.map((alert) => {
              const alertResponses = responsesByAlert.get(alert.id) ?? [];
              const request = Array.isArray(alert.blood_requests)
                ? alert.blood_requests[0]
                : alert.blood_requests;
              const donorProfile = Array.isArray(alert.donor_profiles)
                ? alert.donor_profiles[0]
                : alert.donor_profiles;
              return (
                <div key={alert.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{alert.message}</p>
                    <StatusBadge status={request?.urgency ?? "medium"} />
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    To {getNameFromJoin(donorProfile?.profiles)} • Sent {formatDateTime(alert.created_at)}
                  </p>
                  <div className="space-y-2">
                    {alertResponses.length ? (
                      alertResponses.map((response) => (
                        <div
                          key={response.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2"
                        >
                          <div>
                            <StatusBadge status={response.response_status} />
                            <p className="mt-1 text-xs text-muted-foreground">
                              {response.responded_at
                                ? `Responded ${formatDateTime(response.responded_at)}`
                                : "Awaiting response"}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">{response.note ?? ""}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No responses yet.</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No alerts sent yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
