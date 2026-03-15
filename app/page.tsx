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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { StatusBadge } from "@/components/status-badge";
import { AuthHomeRedirect } from "@/components/auth-home-redirect";
import { ensureProfileForUser, getRoleHomePath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import {
  Building2,
  Clock3,
  Droplets,
  ExternalLink,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Users,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
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

  if (user) {
    try {
      const profile = await ensureProfileForUser(supabase, user);
      redirect(getRoleHomePath(profile.role));
    } catch {
      redirect("/onboarding");
    }
  }

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
      <section className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Droplets className="h-4 w-4" />
            </span>
            Blood Bridge
          </Link>
          <div className="hidden items-center gap-4 text-sm font-medium text-muted-foreground md:flex">
            <Link href="/centres" className="hover:text-foreground">
              Find centres
            </Link>
            <Link href="/auth/sign-up?role=donor" className="hover:text-foreground">
              Become a donor
            </Link>
            <Link href="/auth/sign-up?role=blood_bank_staff" className="hover:text-foreground">
              Blood bank teams
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Button asChild variant="outline">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up?role=donor">Register</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_0.8fr] md:px-6 md:py-14">
          <div className="space-y-6">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              National donor coordination platform
            </Badge>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Help blood banks find and re-engage eligible donors in real time.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-foreground/80">
              Blood Bridge helps blood services register, verify, schedule, and
              re-engage donors while supporting Jamaica&apos;s official clinical
              screening process.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex">
                <Button asChild size="lg" className="rounded-r-none">
                  <Link href="/auth/sign-up?role=donor">Register as donor</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="lg"
                      variant="default"
                      className="rounded-l-none border-l border-primary-foreground/30 px-3"
                    >
                      <ChevronDown className="h-4 w-4" />
                      <span className="sr-only">Choose account type</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/auth/sign-up?role=donor">Donor account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/auth/sign-up?role=blood_bank_staff">
                        Blood bank personnel account
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button asChild size="lg" variant="outline">
                <Link href="/centres">
                  Find donation centres
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-primary/15 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-primary">For Donors</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-foreground/80">
                  Register, track verification status, book appointments, and
                  respond to blood need alerts.
                </CardContent>
              </Card>
              <Card className="border-primary/15 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-primary">
                    For Blood Bank Personnel
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-foreground/80">
                  Create requests, match donors, send alerts, and coordinate
                  appointments from one operations view.
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-primary/20 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock3 className="h-5 w-5 text-primary" />
                Urgent requests
              </CardTitle>
              <CardDescription>
                Live operational panel for immediate coordination.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgentRequests.length ? (
                urgentRequests.map((request) => {
                  const centre = Array.isArray(request.blood_centers)
                    ? request.blood_centers[0]
                    : request.blood_centers;

                  return (
                    <div
                      key={request.id}
                      className="rounded-lg border border-red-200 bg-red-50/80 p-3 dark:border-red-800 dark:bg-red-950/25"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                          {request.blood_type_needed} needed at{" "}
                          {centre?.name ?? "Donation Centre"}
                        </p>
                        <StatusBadge status={request.urgency} />
                      </div>
                      <p className="text-xs text-red-800/90 dark:text-red-200/90">
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
              <div className="rounded-md border bg-accent/35 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{alertCount}</span>{" "}
                donors alerted •{" "}
                <span className="font-semibold text-foreground">{responseCount}</span>{" "}
                responses tracked in realtime
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
        <div className="grid gap-3 rounded-xl border bg-card p-3 md:grid-cols-4">
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Coverage
              </p>
              <p className="mt-1 text-xl font-semibold">{centreCount} blood centres</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Donor data
              </p>
              <p className="mt-1 text-xl font-semibold">{donorCount} donor profiles</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Communication
              </p>
              <p className="mt-1 text-xl font-semibold">{alertCount} realtime alerts</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Coordination
              </p>
              <p className="mt-1 text-xl font-semibold">{responseCount} responses logged</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 md:px-6">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-2xl">How Blood Bridge works</CardTitle>
              <CardDescription>
                A practical, clinically safe flow designed for real operations.
              </CardDescription>
            </div>
            <Badge className="bg-primary text-primary-foreground hover:bg-primary">
              End-to-end donor lifecycle
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="mb-2 text-sm font-semibold text-primary">1. Register + verify</p>
                <p className="text-sm text-muted-foreground">
                  Donors create profiles and progress through ID checks, medical
                  screening, and interview stages.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="mb-2 text-sm font-semibold text-primary">
                  2. Match + engage
                </p>
                <p className="text-sm text-muted-foreground">
                  Staff create blood requests, generate AI outreach copy, and
                  contact matching eligible donors instantly.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="mb-2 text-sm font-semibold text-primary">
                  3. Schedule + respond
                </p>
                <p className="text-sm text-muted-foreground">
                  Donors respond in-app, appointments are coordinated, and teams
                  see realtime status updates across dashboards.
                </p>
              </div>
            </div>
            <Alert className="border-primary/20 bg-accent/45">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <AlertTitle>Clinical safety first</AlertTitle>
              <AlertDescription>
                Blood Bridge supports communication and scheduling. Final
                eligibility decisions remain with qualified clinical teams.
              </AlertDescription>
            </Alert>
            <div className="overflow-hidden rounded-lg border bg-background">
              <Image
                src="/images/real-life-dono.jpg"
                alt="Blood Bridge clinical safety coordination illustration"
                width={1200}
                height={700}
                className="h-auto w-full"
                priority
              />
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                Blood Bridge supports safer donor coordination by 
                helping blood services manage screening, approval, 
                and appointment readiness in one place.
              </p>
            </div>
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
              Guided profile, eligibility tracking, and appointment workflow.
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
              <Sparkles className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg">AI outreach assistant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-foreground/80">
              Staff get urgent, reminder, and follow-up message templates per
              request, ready to copy and send.
            </p>
            <Badge variant="outline" className="border-primary/30 text-primary">
              Demo-ready messaging
            </Badge>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 md:px-6">
        <Separator className="mb-6" />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Built for blood services, hospitals, and donor coordination teams in
            Jamaica.
          </div>
          <Button asChild variant="link" className="h-auto p-0 text-xs">
            <Link href="/auth/sign-up?role=blood_bank_staff">
              Register your blood bank team
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
