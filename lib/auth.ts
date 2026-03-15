import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["donor", "blood_bank_staff", "admin"];

function normalizeRole(value: unknown): UserRole {
  if (typeof value === "string" && VALID_ROLES.includes(value as UserRole)) {
    return value as UserRole;
  }
  return "donor";
}

async function ensureProfile(authUserId: string, email: string, fullName: string) {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as Profile;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      auth_user_id: authUserId,
      email,
      full_name: fullName,
      role: "donor",
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw insertError ?? new Error("Could not create profile");
  }

  // Ensure donor companion rows exist for first-time donor accounts.
  await supabase.from("donor_profiles").upsert(
    {
      profile_id: inserted.id,
      status: "pending_verification",
    },
    { onConflict: "profile_id" },
  );

  await supabase.from("donor_verification_steps").upsert(
    {
      donor_profile_id: inserted.id,
      registered: true,
      approval_outcome: "pending_verification",
    },
    { onConflict: "donor_profile_id" },
  );

  return inserted as Profile;
}

export function getRoleHomePath(role: UserRole) {
  if (role === "admin" || role === "blood_bank_staff") {
    return "/staff";
  }
  return "/donor";
}

export async function requireAuthProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const email = user.email ?? "unknown@bloodbridge.app";
  const fullName =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name.trim()) ||
    email.split("@")[0];

  const profile = await ensureProfile(user.id, email, fullName);

  return { supabase, user, profile: { ...profile, role: normalizeRole(profile.role) } };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const context = await requireAuthProfile();
  if (!allowedRoles.includes(context.profile.role)) {
    redirect(getRoleHomePath(context.profile.role));
  }
  return context;
}
