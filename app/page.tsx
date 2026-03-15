import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="text-lg font-semibold">
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

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:px-6 md:py-16">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Real-time donor coordination
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Build a faster path from willing donor to safe donation.
          </h1>
          <p className="text-lg text-muted-foreground">
            Blood Bridge helps blood bank teams find, verify, schedule, and re-engage eligible donors while respecting
            official screening and approval workflows.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={user ? "/dashboard" : "/auth/sign-up"}>Start now</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/centres">View donation centres</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">MVP workflow coverage</h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>1. Registration and account setup</li>
            <li>2. ID verification</li>
            <li>3. Medical screening and haemoglobin check</li>
            <li>4. Medical interview and approval / temporary deferral</li>
            <li>5. Donation appointment scheduling</li>
            <li>6. Real-time alerts and donor response tracking</li>
          </ul>
          <p className="mt-4 rounded-lg bg-accent p-3 text-xs">
            Important: Blood Bridge supports coordination and communication. Clinical screening and final eligibility
            decisions remain with qualified medical staff.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-16 md:grid-cols-3 md:px-6">
        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Donor tools</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Profile management, eligibility tracker, appointment booking, alerts, and donation history.
          </p>
        </div>
        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Staff tools</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create blood requests, filter donors, send outreach, monitor responses, and coordinate appointments.
          </p>
        </div>
        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Realtime updates</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            New alerts and donor responses propagate with Supabase Realtime for demo-ready coordination.
          </p>
        </div>
      </section>
    </main>
  );
}
