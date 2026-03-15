import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorTriggerForm } from "@/components/staff/monitor-trigger-form";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

function centreNameFromJoin(
  centre: { name: string; parish: string } | Array<{ name: string; parish: string }> | null | undefined,
) {
  if (!centre) {
    return "Unknown centre";
  }
  if (Array.isArray(centre)) {
    return centre[0]?.name ?? "Unknown centre";
  }
  return centre.name ?? "Unknown centre";
}

export default async function StaffMonitorPage() {
  const { supabase } = await requireRole(["blood_bank_staff", "admin"]);

  const { data: criticalRequests } = await supabase
    .from("blood_requests")
    .select("id, blood_type_needed, urgency, required_by, blood_centers(name, parish)")
    .eq("status", "active")
    .eq("urgency", "critical")
    .order("required_by", { ascending: true })
    .limit(10);

  const requests = criticalRequests ?? [];
  const requestIds = requests.map((request) => request.id);

  const { data: recentAlerts } = requestIds.length
    ? await supabase
        .from("donor_alerts")
        .select("id, blood_request_id, created_at")
        .in("blood_request_id", requestIds)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] as Array<{ id: number; blood_request_id: number; created_at: string }> };

  const alertsByRequest = new Map<number, number>();
  for (const alert of recentAlerts ?? []) {
    alertsByRequest.set(
      alert.blood_request_id,
      (alertsByRequest.get(alert.blood_request_id) ?? 0) + 1,
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Inventory Monitor</CardTitle>
          <CardDescription>
            Detect critical blood request thresholds and alert eligible matching donors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MonitorTriggerForm />
          <p className="text-xs text-muted-foreground">
            Automatic monitor runs are also triggered when staff creates a new critical request.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current critical requests</CardTitle>
          <CardDescription>
            These active critical requests are used as the monitor source of truth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.length ? (
            requests.map((request) => (
              <div key={request.id} className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    #{request.id} • {request.blood_type_needed} • {centreNameFromJoin(request.blood_centers)}
                  </p>
                  <StatusBadge status={request.urgency} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Required by {formatDate(request.required_by)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Alerts created for this request: {alertsByRequest.get(request.id) ?? 0}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No active critical requests.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
