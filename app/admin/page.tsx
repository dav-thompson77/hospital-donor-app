import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const { profile } = await requireRole(["admin"]);

  return (
    <AppShell
      role={profile.role}
      fullName={profile.full_name || profile.email}
      title="Admin Dashboard"
      subtitle="High-level oversight for Blood Bridge coordination."
      navItems={[
        { href: "/admin", label: "Admin Home" },
        { href: "/staff", label: "Staff Operations" },
        { href: "/staff/requests", label: "Blood Requests" },
        { href: "/staff/donors", label: "Donors" },
        { href: "/centres", label: "Centres" },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Welcome, admin</CardTitle>
          <CardDescription>
            You can oversee requests, donor workflows, and alert operations across all teams.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/staff">Open staff dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/staff/alerts">Review live responses</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
