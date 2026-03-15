import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthProfile } from "@/lib/auth";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Suspense } from "react";

const donorNav = [
  { href: "/donor", label: "Dashboard" },
  { href: "/donor/profile", label: "My Profile" },
  { href: "/donor/appointments", label: "Appointments" },
  { href: "/donor/alerts", label: "Alerts" },
  { href: "/donor/history", label: "Donation History" },
  { href: "/centres", label: "Centres" },
];

const staffNav = [
  { href: "/staff", label: "Dashboard" },
  { href: "/staff/monitor", label: "AI Monitor" },
  { href: "/staff/donors", label: "Donors" },
  { href: "/staff/requests", label: "Blood Requests" },
  { href: "/staff/appointments", label: "Appointments" },
  { href: "/staff/alerts", label: "Alerts" },
];

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/staff/monitor", label: "AI Monitor" },
  { href: "/staff/donors", label: "Donors" },
  { href: "/staff/requests", label: "Requests" },
];

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await requireAuthProfile().catch(() => null);
  if (!result) redirect("/auth/login");

  const { profile } = result;

  const nav =
    profile.role === "blood_bank_staff"
      ? staffNav
      : profile.role === "admin"
        ? adminNav
        : donorNav;

  const roleLabel =
    profile.role === "blood_bank_staff"
      ? "Staff"
      : profile.role === "admin"
        ? "Admin"
        : "Donor";

  const roleColor =
    profile.role === "blood_bank_staff"
      ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
      : profile.role === "admin"
        ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800"
        : "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800";

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Top nav */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">

          {/* Logo + nav links */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-1 text-lg font-bold">
              <span className="text-red-600">Blood</span>
              <span className="text-foreground">Bridge</span>
            </Link>
            <nav className="hidden gap-1 md:flex">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <span
              className={`hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold md:inline-flex ${roleColor}`}
            >
              {roleLabel}
            </span>
            <span className="hidden text-sm text-muted-foreground md:inline">
              {profile.full_name}
            </span>
            <ThemeSwitcher />
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex gap-1 overflow-x-auto border-t px-4 pb-2 pt-2 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Blood Bridge &mdash; Real-time donor coordination for Jamaica&apos;s blood services
      </footer>
    </div>
  );
}