import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { analyzeInventory, runAIMonitor } from "@/lib/ai/monitor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";

async function triggerMonitorAction() {
  "use server";
  const { createClient } = await import("@/lib/supabase/server");
  const { runAIMonitor } = await import("@/lib/ai/monitor");

  const supabase = await createClient();

  const { data: staffProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "blood_bank_staff")
    .limit(1)
    .single();

  if (staffProfile) {
    await runAIMonitor(supabase, staffProfile.id);
  }

  redirect("/staff/monitor?ran=1");
}

export default async function AIMonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ ran?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireRole(["blood_bank_staff", "admin"]);
  const inventory = await analyzeInventory(supabase);

  const critical = inventory.filter((i) => i.isCritical);
  const low = inventory.filter((i) => i.isLow && !i.isCritical);
  const safe = inventory.filter((i) => !i.isLow && !i.isCritical);
  const trend = inventory[0]?.trendReason ?? "Normal demand period";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">AI Inventory Monitor</h1>
          <p className="text-muted-foreground">
            Real-time blood type shortage detection and donor matching.
          </p>
        </div>
        <form action={triggerMonitorAction}>
          <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
            <BrainCircuit className="mr-2 h-4 w-4" />
            Trigger AI monitor now
          </Button>
        </form>
      </div>

      {/* Success banner */}
      {params.ran === "1" && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
          <div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              AI monitor ran successfully
            </p>
            <p className="text-sm text-muted-foreground">
              Inventory analysed. Critical donors have been alerted automatically.
            </p>
          </div>
        </div>
      )}

      {/* Current trend banner */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
        <TrendingUp className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Current trend detected
          </p>
          <p className="text-sm text-muted-foreground">{trend}</p>
        </div>
      </div>

      {/* Critical */}
      {critical.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-700 dark:text-red-400">
                Critical — Immediate action required
              </CardTitle>
            </div>
            <CardDescription>
              These blood types are below the critical threshold. Matching donors
              have been automatically alerted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {critical.map((item) => (
                <div
                  key={item.bloodType}
                  className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-2xl font-bold text-red-700 dark:text-red-400">
                      {item.bloodType}
                    </span>
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-400">
                      CRITICAL
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      Eligible donors:{" "}
                      <span className="font-semibold text-red-600">
                        {item.eligibleDonors}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Threshold:{" "}
                      <span className="font-semibold">{item.adjustedThreshold}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Active requests:{" "}
                      <span className="font-semibold">{item.activeRequests}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Recent donations:{" "}
                      <span className="font-semibold">{item.recentDonations}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low */}
      {low.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-700 dark:text-amber-400">
                Low — Monitor closely
              </CardTitle>
            </div>
            <CardDescription>
              These blood types are running low but not yet critical.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {low.map((item) => (
                <div
                  key={item.bloodType}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                      {item.bloodType}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                      LOW
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      Eligible donors:{" "}
                      <span className="font-semibold text-amber-600">
                        {item.eligibleDonors}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Threshold:{" "}
                      <span className="font-semibold">{item.adjustedThreshold}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Active requests:{" "}
                      <span className="font-semibold">{item.activeRequests}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Recent donations:{" "}
                      <span className="font-semibold">{item.recentDonations}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Safe */}
      {safe.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-700 dark:text-green-400">
                Safe — Within normal range
              </CardTitle>
            </div>
            <CardDescription>
              These blood types have sufficient eligible donors available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {safe.map((item) => (
                <div key={item.bloodType} className="rounded-lg border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-2xl font-bold">{item.bloodType}</span>
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700 dark:bg-green-950 dark:text-green-400">
                      SAFE
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      Eligible donors:{" "}
                      <span className="font-semibold text-green-600">
                        {item.eligibleDonors}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Recent donations:{" "}
                      <span className="font-semibold">{item.recentDonations}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>How the AI monitor works</CardTitle>
          <CardDescription>
            What the system analyses to detect shortages before they become emergencies.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">📊 Inventory levels</p>
            <p className="text-sm text-muted-foreground">
              Counts eligible donors per blood type who are currently approved
              and past their next eligible donation date.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">📈 Consumption rates</p>
            <p className="text-sm text-muted-foreground">
              Tracks donations made in the last 30 days to understand how
              quickly each blood type is being used.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">🌍 Real-world trends</p>
            <p className="text-sm text-muted-foreground">
              Adjusts thresholds based on weekend trauma patterns, prenatal
              admission seasons, and surgical volume cycles in Jamaica.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}