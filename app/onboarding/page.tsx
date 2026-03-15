import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getRoleHomePath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import { redirect } from "next/navigation";

const VALID_ROLES: UserRole[] = ["donor", "blood_bank_staff", "admin"];

export default async function OnboardingFallbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  let resolvedRole: UserRole | null = null;

  const { data: profileByAuthUser } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (
    typeof profileByAuthUser?.role === "string" &&
    VALID_ROLES.includes(profileByAuthUser.role as UserRole)
  ) {
    resolvedRole = profileByAuthUser.role as UserRole;
  }

  if (!resolvedRole && user.email) {
    const { data: profileByEmail } = await supabase
      .from("profiles")
      .select("id, role, auth_user_id")
      .eq("email", user.email)
      .maybeSingle();

    if (
      profileByEmail?.id &&
      typeof profileByEmail.role === "string" &&
      VALID_ROLES.includes(profileByEmail.role as UserRole)
    ) {
      resolvedRole = profileByEmail.role as UserRole;

      if (!profileByEmail.auth_user_id) {
        await supabase
          .from("profiles")
          .update({ auth_user_id: user.id })
          .eq("id", profileByEmail.id);
      }
    }
  }

  if (resolvedRole) {
    redirect(getRoleHomePath(resolvedRole));
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Account setup in progress</CardTitle>
          <CardDescription>
            We could not determine your role yet. You can continue to your profile while setup completes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild>
            <Link href="/donor/profile">Continue setup</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Retry dashboard routing</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
