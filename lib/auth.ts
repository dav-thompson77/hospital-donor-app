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
    let existingProfile = existing;
    const existingRole = normalizeRole(existingProfile.role);

    const profilePatch: Record<string, string | null> = {};
    if (requestedRole === "donor" && donorPhone && donorPhone !== existingProfile.phone) {
      profilePatch.phone = donorPhone;
    }
    if (requestedRole === "blood_bank_staff") {
      if (staffIdNumber && staffIdNumber !== existingProfile.staff_id_number) {
        profilePatch.staff_id_number = staffIdNumber;
      }
      if (staffFacility && staffFacility !== existingProfile.staff_facility) {
        profilePatch.staff_facility = staffFacility;
      }
      if (staffWorkPhone && staffWorkPhone !== existingProfile.staff_work_phone) {
        profilePatch.staff_work_phone = staffWorkPhone;
      }
    }

    if (Object.keys(profilePatch).length) {
      const { data: patchedProfile, error: patchError } = await supabase
        .from("profiles")
        .update(profilePatch)
        .eq("id", existingProfile.id)
        .select("*")
        .single();

      if (patchError || !patchedProfile) {
        throw patchError ?? new Error("Could not update profile details");
      }

      existingProfile = patchedProfile;
    }

    if (requestedRole === "donor" && donorBloodType) {
      await supabase.from("donor_profiles").upsert(
        {
          profile_id: existingProfile.id,
          blood_type: donorBloodType,
        },
        { onConflict: "profile_id" },
      );
    }

    if (existingRole !== requestedRole && existingRole !== "admin") {
      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update({ role: requestedRole })
        .eq("id", existingProfile.id)
        .select("*")
        .single();

      if (updateError || !updated) {
        throw updateError ?? new Error("Could not update profile role");
      }

      if (requestedRole === "donor") {
        await supabase.from("donor_profiles").upsert(
          {
            profile_id: updated.id,
            status: "pending_verification",
            blood_type: donorBloodType,
          },
          { onConflict: "profile_id" },
        );

        await supabase.from("donor_verification_steps").upsert(
          {
            donor_profile_id: updated.id,
            registered: true,
            approval_outcome: "pending_verification",
          },
          { onConflict: "donor_profile_id" },
        );
      }

      return { ...updated, role: normalizeRole(updated.role) } as Profile;
    }

    return { ...existingProfile, role: existingRole } as Profile;
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
