import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["donor", "blood_bank_staff", "admin"];

function normalizeRole(value: unknown): UserRole {
  if (typeof value === "string" && VALID_ROLES.includes(value as UserRole)) {
    return value as UserRole;
  }
  return "donor";
}

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email" | "user_metadata">,
) {
  const authUserId = user.id;
  const email = user.email ?? "unknown@bloodbridge.app";
  const requestedRole = normalizeRole(user.user_metadata?.role);
  const fullName =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name.trim()) ||
    email.split("@")[0];

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return { ...existing, role: normalizeRole(existing.role) } as Profile;
  }

  const { data: existingByEmail, error: existingByEmailError } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (existingByEmailError) {
    throw existingByEmailError;
  }

  if (existingByEmail) {
    if (
      existingByEmail.auth_user_id &&
      String(existingByEmail.auth_user_id) !== authUserId
    ) {
      throw new Error("Email is already linked to another account");
    }

    const { data: linkedProfile, error: linkedProfileError } = await supabase
      .from("profiles")
      .update({
        auth_user_id: authUserId,
        full_name: existingByEmail.full_name || fullName,
      })
      .eq("id", existingByEmail.id)
      .select("*")
      .single();

    if (linkedProfileError || !linkedProfile) {
      throw linkedProfileError ?? new Error("Could not link existing profile");
    }

    if (normalizeRole(linkedProfile.role) === "donor") {
      await supabase.from("donor_profiles").upsert(
        {
          profile_id: linkedProfile.id,
          status: "pending_verification",
        },
        { onConflict: "profile_id" },
      );

      await supabase.from("donor_verification_steps").upsert(
        {
          donor_profile_id: linkedProfile.id,
          registered: true,
          approval_outcome: "pending_verification",
        },
        { onConflict: "donor_profile_id" },
      );
    }

    return { ...linkedProfile, role: normalizeRole(linkedProfile.role) } as Profile;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      auth_user_id: authUserId,
      email,
      full_name: fullName,
      role: requestedRole,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw insertError ?? new Error("Could not create profile");
  }

  if (requestedRole === "donor") {
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
  }

  return { ...inserted, role: normalizeRole(inserted.role) } as Profile;
}

export function getRoleHomePath(role: UserRole) {
  if (role === "admin") {
    return "/admin";
  }
  if (role === "blood_bank_staff") {
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

  const profile = await ensureProfileForUser(supabase, user);

  return { supabase, user, profile };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const context = await requireAuthProfile();
  if (!allowedRoles.includes(context.profile.role)) {
    redirect(getRoleHomePath(context.profile.role));
  }
  return context;
}
