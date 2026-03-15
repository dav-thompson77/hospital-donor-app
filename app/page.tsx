import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { StatusBadge } from "@/components/status-badge";
import { AuthHomeRedirect } from "@/components/auth-home-redirect";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import {
  BellRing,
  Building2,
  Clock3,
  Droplets,
  HeartPulse,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const hasCode = typeof params.code === "string" && params.code.length > 0;
  const hasTokenHash =
    typeof params.token_hash === "string" &&
    params.token_hash.length > 0 &&
    typeof params.type === "string" &&
    params.type.length > 0;

  if (hasCode || hasTokenHash) {
    const callbackParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") {
        callbackParams.set(key, value);
      }
    }
    if (!callbackParams.has("next")) {
      callbackParams.set("next", "/dashboard");
    }
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    centresCountResult,
    donorsCountResult,
    alertsCountResult,
    responsesCountResult,
    urgentRequestsResult,
  ] = await Promise.all([
    supabase
      .from("blood_centers")
      .select("id", { head: true, count: "exact" })
      .eq("is_active", true),
    supabase
      .from("donor_profiles")
      .select("profile_id", { head: true, count: "exact" }),
    supabase.from("donor_alerts").select("id", { head: true, count: "exact" }),
    supabase
      .from("donor_alert_responses")
      .select("id", { head: true, count: "exact" })
      .neq("response_status", "pending"),
    supabase
      .from("blood_requests")
      .select(
        "id, blood_type_needed, urgency, required_by, blood_centers(name, parish)",
      )
      .eq("status", "active")
      .order("required_by", { ascending: true })
      .limit(4),
  ]);

  const centreCount = centresCountResult.count ?? 0;
  const donorCount = donorsCountResult.count ?? 0;
  const alertCount = alertsCountResult.count ?? 0;
  const responseCount = responsesCountResult.count ?? 0;
  const urgentRequests = urgentRequestsResult.data ?? [];

  return (
    <main className="min-h-screen bg-background">
      <AuthHomeRedirect />
      <section className="border-b bg-card/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Droplets className="h-4 w-4" />
            </span>
            Blood Bridge
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/sign-up">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:px-6 md:py-14">
        <div className="space-y-6">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-primary"
          >
            Real-time donor coordination
          </Badge>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Help blood banks find and re-engage eligible donors in real time.
          </h1>
          <p className="text-lg leading-relaxed text-foreground/80">
            Blood Bridge helps blood services register, verify, schedule, and
            re-engage eligible donors while supporting the official screening
            process.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={user ? "/dashboard" : "/auth/sign-up?role=donor"}>
                Sign up as donor
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link
                href={
                  user
                    ? "/dashboard"
                    : "/auth/sign-up?role=blood_bank_staff"
                }
              >
                Sign up as blood bank
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/centres">View donation centres</Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Button asChild size="sm" variant="outline">
              <Link href="/donor">Open donor dashboard</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/staff">Open blood bank dashboard</Link>
            </Button>
          </div>

          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-primary">For Donors</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground/80">
                Register, track status, book appointments, and respond to alerts.
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-primary">
                  For Blood Bank Staff
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground/80">
                Create requests, filter donors, send alerts, and coordinate
                appointments.
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>How Blood Bridge works</CardTitle>
            <CardDescription>
              The platform supports the official blood donation workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/80">
            <div className="grid gap-2 rounded-md border bg-background p-3">
              <p>1. Registration and account setup</p>
              <p>2. ID verification and medical screening</p>
              <p>3. Haemoglobin check and medical interview</p>
              <p>4. Approval / temporary deferral updates</p>
              <p>5. Donation appointment scheduling</p>
              <p>6. Realtime alerts and response tracking</p>
            </div>
            <Alert className="border-primary/20 bg-accent/45">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <AlertTitle>Clinical safety first</AlertTitle>
              <AlertDescription>
                Blood Bridge coordinates communication and scheduling. Final
                eligibility decisions remain with qualified clinical teams.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-6 md:px-6">
        <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-4">
          <Card className="border-0 shadow-none">
            <CardContent className="p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Coverage
              </p>
              <p className="mt-1 text-xl font-semibold">{centreCount} blood centres</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-none">
            <CardContent className="p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Donor data
              </p>
              <p className="mt-1 text-xl font-semibold">{donorCount} donor profiles</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-none">
            <CardContent className="p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Communication
              </p>
              <p className="mt-1 text-xl font-semibold">{alertCount} realtime alerts</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-none">
            <CardContent className="p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Coordination
              </p>
              <p className="mt-1 text-xl font-semibold">{responseCount} responses logged</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-6 md:px-6">
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-2xl">Urgent requests</CardTitle>
              <CardDescription>
                Live operational view for blood demand across centres.
              </CardDescription>
            </div>
            <Badge className="bg-red-600 text-white hover:bg-red-600">
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              live priority feed
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {urgentRequests.length ? (
              urgentRequests.map((request) => {
                const centre = Array.isArray(request.blood_centers)
                  ? request.blood_centers[0]
                  : request.blood_centers;

                return (
                  <div
                    key={request.id}
                    className="rounded-lg border border-red-200 bg-red-50/70 p-3 dark:border-red-900 dark:bg-red-950/20"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                        {request.blood_type_needed} needed at {centre?.name ?? "Centre"}
                      </p>
                      <StatusBadge status={request.urgency} />
                    </div>
                    <p className="text-xs text-red-800/90 dark:text-red-300/90">
                      {centre?.parish ?? "Parish"} • Required by{" "}
                      {formatDate(request.required_by)}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No active urgent requests right now.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-16 md:grid-cols-3 md:px-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HeartPulse className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg">Donor tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-foreground/80">
              Guided profile, status tracker, and appointment flow.
            </p>
            <Badge variant="outline" className="border-primary/30 text-primary">
              6-step donor journey
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg">Staff tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-foreground/80">
              Request creation, filtering, outreach, and scheduling.
            </p>
            <Badge variant="outline" className="border-primary/30 text-primary">
              Role-based coordination
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <BellRing className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg">Realtime updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-foreground/80">
              Alerts, responses, and appointment changes refresh instantly.
            </p>
            <Badge variant="outline" className="border-primary/30 text-primary">
              Instant alert sync
            </Badge>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 md:px-6">
        <Separator className="mb-6" />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          Built for blood services, hospitals, and donor coordination teams in
          Jamaica.
        </div>
      </section>
    </main>
  );
}
