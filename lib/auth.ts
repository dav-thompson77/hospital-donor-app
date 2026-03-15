import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BLOOD_TYPES, type Profile, type UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["donor", "blood_bank_staff", "admin"];

function normalizeRole(value: unknown): UserRole {
  if (typeof value === "string" && VALID_ROLES.includes(value as UserRole)) {
    return value as UserRole;
  }
  return "donor";
}

function normalizeBloodType(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  return BLOOD_TYPES.includes(normalized as (typeof BLOOD_TYPES)[number]) ? normalized : null;
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
  const donorPhone =
    typeof user.user_metadata?.phone === "string" &&
    user.user_metadata.phone.trim().length
      ? user.user_metadata.phone.trim()
      : null;
  const donorBloodType = normalizeBloodType(user.user_metadata?.donor_blood_type);
  const staffIdNumber =
    typeof user.user_metadata?.staff_id_number === "string" &&
    user.user_metadata.staff_id_number.trim().length
      ? user.user_metadata.staff_id_number.trim()
      : null;
  const staffFacility =
    typeof user.user_metadata?.staff_facility === "string" &&
    user.user_metadata.staff_facility.trim().length
      ? user.user_metadata.staff_facility.trim()
      : null;
  const staffWorkPhone =
    typeof user.user_metadata?.staff_work_phone === "string" &&
    user.user_metadata.staff_work_phone.trim().length
      ? user.user_metadata.staff_work_phone.trim()
      : null;

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    if (requestedRole === "donor" && donorBloodType) {
      await supabase.from("donor_profiles").upsert(
        {
          profile_id: existing.id,
          blood_type: donorBloodType,
        },
        { onConflict: "profile_id" },
      );
    }
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
          blood_type: donorBloodType,
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
      phone: requestedRole === "donor" ? donorPhone : null,
      staff_id_number: requestedRole === "blood_bank_staff" ? staffIdNumber : null,
      staff_facility: requestedRole === "blood_bank_staff" ? staffFacility : null,
      staff_work_phone: requestedRole === "blood_bank_staff" ? staffWorkPhone : null,
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
        blood_type: donorBloodType,
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
