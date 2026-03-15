import { respondToAlertAction } from "@/app/actions/donor";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export default async function DonorAlertsPage() {
  const { supabase, profile } = await requireRole(["donor", "admin"]);

  const [alertsResult, responsesResult] = await Promise.all([
    supabase
      .from("donor_alerts")
      .select("id, message, created_at, blood_requests(blood_type_needed, urgency, required_by)")
      .eq("donor_profile_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("donor_alert_responses")
      .select("alert_id, response_status, note, responded_at")
      .eq("donor_profile_id", profile.id),
  ]);

  const alerts = alertsResult.data ?? [];
  const responses = responsesResult.data ?? [];
  const responseMap = new Map<number, (typeof responses)[number]>();
  for (const response of responses) {
    responseMap.set(response.alert_id, response);
  }

  return (
    <>
      <RealtimeRefresher donorProfileId={profile.id} />

      <Card>
        <CardHeader>
          <CardTitle>Real-time alerts</CardTitle>
          <CardDescription>
            Respond as interested, booked, or unavailable so staff can coordinate quickly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.length ? (
            alerts.map((alert) => {
              const response = responseMap.get(alert.id);
              const request = Array.isArray(alert.blood_requests)
                ? alert.blood_requests[0]
                : alert.blood_requests;
              return (
                <div key={alert.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <StatusBadge status={response?.response_status ?? "pending"} />
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Sent {formatDateTime(alert.created_at)} | Need:{" "}
                    {request?.blood_type_needed ?? "Any"} | Urgency: {request?.urgency ?? "unknown"}
                  </p>

                  <form action={respondToAlertAction} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input type="hidden" name="alert_id" value={alert.id} />
                    <div className="space-y-2">
                      <Label htmlFor={`response-${alert.id}`}>Your response</Label>
                      <select
                        id={`response-${alert.id}`}
                        name="response_status"
                        defaultValue={response?.response_status ?? "pending"}
                        className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="interested">Interested</option>
                        <option value="booked">Booked</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`note-${alert.id}`}>Note (optional)</Label>
                      <Input
                        id={`note-${alert.id}`}
                        name="note"
                        defaultValue={response?.note ?? ""}
                        placeholder="Add availability note"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit">Save</Button>
                    </div>
                  </form>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No alerts have been sent yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
