import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["blood_bank_staff", "admin"]);

  return (
    <AppShell
      role={profile.role}
      fullName={profile.full_name || profile.email}
      title="Staff Coordination Hub"
      subtitle="Manage blood requests, outreach, and donor scheduling in real time."
      navItems={[
        { href: "/staff", label: "Dashboard" },
        { href: "/staff/donors", label: "Donors" },
        { href: "/staff/requests", label: "Blood Requests" },
        { href: "/staff/monitor", label: "AI Monitor" },
        { href: "/staff/appointments", label: "Appointments" },
        { href: "/staff/alerts", label: "Alerts & Responses" },
        { href: "/centres", label: "Donation Centres" },
      ]}
    >
      {children}
    </AppShell>
  );
}
