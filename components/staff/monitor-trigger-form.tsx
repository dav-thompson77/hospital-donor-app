"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  initialMonitorActionState,
  triggerAIMonitorNowAction,
} from "@/app/actions/monitor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, TriangleAlert } from "lucide-react";

function TriggerSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="inline-flex items-center gap-2" disabled={pending}>
      <Sparkles className="h-4 w-4" />
      {pending ? "Running AI monitor..." : "Trigger AI Monitor Now"}
    </Button>
  );
}

export function MonitorTriggerForm() {
  const [state, formAction, isPending] = useActionState(
    triggerAIMonitorNowAction,
    initialMonitorActionState,
  );

  const result = state.result;
  const hasRun = state.status !== "idle";

  return (
    <div className="space-y-4">
      <form action={formAction}>
        <TriggerSubmitButton />
      </form>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Running monitor...</p>
      ) : null}

      {hasRun && state.status === "success" ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>AI monitor completed</AlertTitle>
          <AlertDescription>
            {state.message ?? "Monitor run completed."}
            {result ? (
              <span className="block pt-1">
                Processed {result.processedRequests} critical request(s), matched{" "}
                {result.donorsMatched} donor(s), created {result.alertsCreated} alert(s),
                deduped {result.deduped}.
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {hasRun && state.status === "error" ? (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>AI monitor failed</AlertTitle>
          <AlertDescription>{state.message ?? "Unexpected monitor error."}</AlertDescription>
        </Alert>
      ) : null}

      {result?.details?.length ? (
        <div className="space-y-2 rounded-md border bg-accent/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trigger details
          </p>
          <div className="space-y-1">
            {result.details.map((detail) => (
              <p key={`monitor-detail-${detail.requestId}`} className="text-xs text-muted-foreground">
                Request #{detail.requestId} ({detail.bloodType}, {detail.urgency}) — matched{" "}
                {detail.donorsMatched}, created {detail.alertsCreated}, deduped {detail.deduped}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
