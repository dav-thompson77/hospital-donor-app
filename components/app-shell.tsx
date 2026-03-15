import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
}

interface AppShellProps {
  role: UserRole;
  fullName: string;
  title: string;
  subtitle: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

function roleLabel(role: UserRole) {
  if (role === "blood_bank_staff") {
    return "Blood Bank Staff";
  }
  if (role === "admin") {
    return "Admin";
  }
  return "Donor";
}

export function AppShell({
  role,
  fullName,
  title,
  subtitle,
  navItems,
  children,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <Link href="/" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Blood Bridge
            </Link>
            <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
              {roleLabel(role)}
            </span>
            <span className="text-sm text-muted-foreground">Signed in as {fullName}</span>
            <ThemeSwitcher />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:px-6">
        <aside className="rounded-xl border bg-card p-3">
          <nav className="flex flex-wrap gap-2 md:flex-col">
            {navItems.map((item) => (
              <Button key={item.href} asChild variant="ghost" className="justify-start">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
        </aside>
        <section className="space-y-6">{children}</section>
      </div>
    </main>
  );
}
