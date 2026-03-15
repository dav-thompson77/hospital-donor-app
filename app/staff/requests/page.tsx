import { createBloodRequestAction } from "@/app/actions/staff";
import { AiSuggestionList } from "@/components/staff/ai-suggestion-list";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { getBloodCentres } from "@/lib/data";
import { BLOOD_TYPES } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";

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

function normalizeSuggestionList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
}

export default async function StaffBloodRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    alerts?: string;
    smsSent?: string;
    smsFailed?: string;
    smsWarning?: string;
  }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireRole(["blood_bank_staff", "admin"]);

  const [centresResult, requestsResult] = await Promise.all([
    getBloodCentres(supabase),
    supabase
      .from("blood_requests")
      .select("id, blood_type_needed, urgency, required_by, note, status, ai_message_suggestions, blood_centers(name)")
      .order("created_at", { ascending: false }),
  ]);

  const centres = centresResult;
  const requests = requestsResult.data ?? [];
  const hasCentres = centres.length > 0;

  return (
    <div className="space-y-6">
      {params.saved === "1" ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Blood request created</AlertTitle>
          <AlertDescription>
            Request saved. {params.alerts ?? "0"} donor alerts created,{" "}
            {params.smsSent ?? "0"} SMS sent
            {(params.smsFailed ?? "0") !== "0" ? `, ${params.smsFailed} SMS failed.` : "."}
          </AlertDescription>
        </Alert>
      ) : null}

      {params.smsWarning ? (
        <Alert variant="destructive">
          <Wand2 className="h-4 w-4" />
          <AlertTitle>SMS provider warning</AlertTitle>
          <AlertDescription>{params.smsWarning}</AlertDescription>
        </Alert>
      ) : null}

      {params.error ? (
        <Alert variant="destructive">
          <Wand2 className="h-4 w-4" />
          <AlertTitle>Could not create request</AlertTitle>
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}

      <Alert className="border-primary/20 bg-accent/45">
        <Wand2 className="h-4 w-4 text-primary" />
        <AlertTitle>AI outreach assistant (demo-ready)</AlertTitle>
        <AlertDescription>
          Every request auto-generates three message variants: urgent outreach,
          reminder, and follow-up confirmation. Copy any suggestion and send it
          from the Alerts page.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Create blood request + generate outreach</CardTitle>
          <CardDescription>
            Add request details and the app will generate reusable outreach copy
            tailored to urgency, blood type, and centre context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createBloodRequestAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="blood_type_needed">Blood type needed</Label>
              <select
                id="blood_type_needed"
                name="blood_type_needed"
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                {BLOOD_TYPES.map((bloodType) => (
                  <option key={bloodType} value={bloodType}>
                    {bloodType}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency level</Label>
              <select
                id="urgency"
                name="urgency"
                defaultValue="medium"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="center_id">Donation centre</Label>
              <select
                id="center_id"
                name="center_id"
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">Select centre</option>
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.name} ({centre.parish})
                  </option>
                ))}
              </select>
              {!hasCentres ? (
                <p className="text-xs text-destructive">
                  No active donation centres found. Seed centres in Supabase to create requests.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="required_by">Required by date</Label>
              <Input id="required_by" name="required_by" type="date" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="note">Message / note</Label>
              <Textarea
                id="note"
                name="note"
                placeholder="Context for donor outreach and hospital request details"
              />
            </div>
            <Button type="submit" className="md:col-span-2" disabled={!hasCentres}>
              <Sparkles className="h-4 w-4" />
              Create request + generate outreach copy
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active and recent requests</CardTitle>
            <CardDescription>Review urgency and generated outreach templates.</CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/staff/alerts">Send alerts</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {requests.length ? (
            requests.map((request) => {
              const suggestions = normalizeSuggestionList(
                request.ai_message_suggestions,
              );
              return (
                <div key={request.id} className="rounded-lg border p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    Request #{request.id} • {request.blood_type_needed} •{" "}
                    {centreNameFromJoin(request.blood_centers)}
                  </p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={request.urgency} />
                    <StatusBadge status={request.status} />
                  </div>
                </div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Required by {formatDate(request.required_by)}
                </p>
                {request.note ? <p className="mb-3 text-sm">{request.note}</p> : null}
                <div className="space-y-2 rounded-md bg-accent/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      AI-assisted outreach suggestions
                    </p>
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      3 templates ready
                    </Badge>
                  </div>
                  {suggestions.length ? (
                    <AiSuggestionList
                      requestId={request.id}
                      suggestions={suggestions}
                      bloodType={request.blood_type_needed}
                      urgency={request.urgency as "low" | "medium" | "high" | "critical"}
                      requiredBy={request.required_by}
                      centreName={centreNameFromJoin(request.blood_centers)}
                      messageContext={request.note}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">No suggestions stored.</p>
                  )}
                </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No blood requests yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
