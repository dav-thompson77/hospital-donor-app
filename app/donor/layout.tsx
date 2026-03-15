import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function DonorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["donor", "admin"]);

  return (
    <AppShell
      role={profile.role}
      fullName={profile.full_name || profile.email}
      title="Donor Portal"
      subtitle="Track eligibility, appointments, and live blood alerts."
      navItems={[
        { href: "/donor", label: "Dashboard" },
        { href: "/donor/profile", label: "My Profile" },
        { href: "/donor/appointments", label: "Appointments" },
        { href: "/donor/alerts", label: "Alerts" },
        { href: "/donor/donations", label: "Donation History" },
        { href: "/centres", label: "Donation Centres" },
      ]}
    >
      {children}
    </AppShell>
  );
}
