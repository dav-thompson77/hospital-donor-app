import { SignUpForm } from "@/components/sign-up-form";
import type { UserRole } from "@/lib/types";

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

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm role={role} />
      </div>
    </div>
  );
}
