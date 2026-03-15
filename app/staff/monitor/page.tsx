import { triggerAIMonitorNowAction } from "@/app/actions/monitor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, Sparkles, TriangleAlert } from "lucide-react";

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

export default async function StaffMonitorPage({
  searchParams,
}: {
  searchParams: Promise<{
    ran?: string;
    processed?: string;
    matched?: string;
    created?: string;
    deduped?: string;
    message?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireRole(["blood_bank_staff", "admin"]);

  const ran = params.ran === "1";
  const processed = Number(params.processed ?? "0");
  const matched = Number(params.matched ?? "0");
  const created = Number(params.created ?? "0");
  const deduped = Number(params.deduped ?? "0");
  const message = params.message;
  const error = params.error;

  const { data: criticalRequests } = await supabase
    .from("blood_requests")
    .select("id, blood_type_needed, urgency, required_by, blood_centers(name, parish)")
    .eq("status", "active")
    .eq("urgency", "critical")
    .order("required_by", { ascending: true })
    .limit(10);

  const requests = criticalRequests ?? [];

  return (
    <div className="space-y-6">
      {ran && !error ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>AI monitor completed</AlertTitle>
          <AlertDescription>
            {message ?? "Monitor run completed."} Processed {processed} request(s), matched{" "}
            {matched} donor(s), created {created} alert(s), deduped {deduped}.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>AI monitor failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>AI Inventory Monitor</CardTitle>
          <CardDescription>
            Detect critical blood request thresholds and alert eligible matching donors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={triggerAIMonitorNowAction}>
            <Button type="submit" className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Trigger AI Monitor Now
            </Button>
          </form>
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
