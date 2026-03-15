import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
      <header className="border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-wider text-primary/80"
            >
              Blood Bridge
            </Link>
            <h1 className="text-xl font-semibold text-foreground md:text-2xl">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              {roleLabel(role)}
            </Badge>
            <span className="text-sm text-muted-foreground">Signed in as {fullName}</span>
            <ThemeSwitcher />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:px-6">
        <aside className="rounded-xl border bg-card p-3 shadow-sm">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Navigation
          </p>
          <Separator className="mb-2" />
          <nav className="flex flex-wrap gap-2 md:flex-col">
            {navItems.map((item) => (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className="justify-start text-foreground/90 hover:bg-accent"
              >
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
