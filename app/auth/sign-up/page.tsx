import { SignUpForm } from "@/components/sign-up-form";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function normalizeRole(role: string | undefined): UserRole {
  if (role === "blood_bank_staff") {
    return "blood_bank_staff";
  }
  return "donor";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const role = normalizeRole(params.role);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const backHref = user ? "/dashboard" : "/";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm" className="px-2">
            <Link href={backHref} className="inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
        <SignUpForm role={role} />
      </div>
    </div>
  );
}
