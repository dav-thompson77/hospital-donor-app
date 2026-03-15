import { createBloodRequestAction } from "@/app/actions/staff";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { BLOOD_TYPES } from "@/lib/types";
import { formatDate } from "@/lib/utils";
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

export default async function StaffBloodRequestsPage() {
  const { supabase } = await requireRole(["blood_bank_staff", "admin"]);

  const [centresResult, requestsResult] = await Promise.all([
    supabase.from("blood_centers").select("id, name, parish").eq("is_active", true).order("name"),
    supabase
      .from("blood_requests")
      .select("id, blood_type_needed, urgency, required_by, note, status, ai_message_suggestions, blood_centers(name)")
      .order("created_at", { ascending: false }),
  ]);

  const centres = centresResult.data ?? [];
  const requests = requestsResult.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create blood request</CardTitle>
          <CardDescription>
            Add request details and auto-generate outreach message suggestions for matching donors.
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
            <Button type="submit" className="md:col-span-2">
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
            requests.map((request) => (
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    AI-assisted outreach suggestions
                  </p>
                  {(request.ai_message_suggestions as string[] | null)?.length ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {(request.ai_message_suggestions as string[]).map((suggestion, index) => (
                        <li key={`${request.id}-suggestion-${index}`}>{suggestion}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No suggestions stored.</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No blood requests yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
