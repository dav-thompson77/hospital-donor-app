"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { AlertResponseStatus, AppointmentType, DonorStatus } from "@/lib/types";

const APPOINTMENT_TYPES: AppointmentType[] = ["blood_typing", "screening", "donation"];
const RESPONSE_STATUSES: AlertResponseStatus[] = [
  "pending",
  "interested",
  "booked",
  "unavailable",
];
const DONOR_STATUSES: DonorStatus[] = [
  "pending_verification",
  "approved",
  "temporarily_deferred",
  "eligible_again",
];

export async function updateDonorProfileAction(formData: FormData) {
  const { supabase, profile } = await requireRole(["donor"]);

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const parish = String(formData.get("parish") ?? "").trim();
  const bloodType = String(formData.get("blood_type") ?? "").trim();
  const dateOfBirth = String(formData.get("date_of_birth") ?? "").trim();
  const emergencyContact = String(formData.get("emergency_contact") ?? "").trim();

  await supabase
    .from("profiles")
    .update({
      full_name: fullName || profile.full_name,
      phone: phone || null,
      parish: parish || null,
    })
    .eq("id", profile.id);

  await supabase.from("donor_profiles").upsert(
    {
      profile_id: profile.id,
      blood_type: bloodType || null,
      date_of_birth: dateOfBirth || null,
      emergency_contact: emergencyContact || null,
    },
    { onConflict: "profile_id" },
  );

  await supabase.from("donor_verification_steps").upsert(
    {
      donor_profile_id: profile.id,
      registered: true,
      approval_outcome: "pending_verification",
    },
    { onConflict: "donor_profile_id" },
  );

  revalidatePath("/donor");
  revalidatePath("/donor/profile");
}

export async function bookDonorAppointmentAction(formData: FormData) {
  const { supabase, profile } = await requireRole(["donor"]);

  const centreId = Number(formData.get("centre_id"));
  const appointmentType = String(formData.get("appointment_type"));
  const scheduledAt = String(formData.get("scheduled_at") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!Number.isFinite(centreId) || !APPOINTMENT_TYPES.includes(appointmentType as AppointmentType) || !scheduledAt) {
    return;
  }

  await supabase.from("appointments").insert({
    donor_profile_id: profile.id,
    created_by_profile_id: profile.id,
    centre_id: centreId,
    appointment_type: appointmentType,
    scheduled_at: new Date(scheduledAt).toISOString(),
    status: "scheduled",
    notes: notes || null,
  });

  revalidatePath("/donor");
  revalidatePath("/donor/appointments");
}

export async function respondToAlertAction(formData: FormData) {
  const { supabase, profile } = await requireRole(["donor"]);

  const alertId = Number(formData.get("alert_id"));
  const response = String(formData.get("response_status") ?? "pending");
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isFinite(alertId) || !RESPONSE_STATUSES.includes(response as AlertResponseStatus)) {
    return;
  }

  await supabase
    .from("donor_alert_responses")
    .upsert(
      {
        alert_id: alertId,
        donor_profile_id: profile.id,
        response_status: response,
        responded_at: response === "pending" ? null : new Date().toISOString(),
        note: note || null,
      },
      { onConflict: "alert_id,donor_profile_id" },
    );

  if (response === "booked") {
    await supabase.from("notifications").insert({
      recipient_profile_id: profile.id,
      source_type: "alert_response",
      source_id: alertId,
      title: "Response received",
      body: "Your booked response was submitted. Staff will confirm your slot.",
    });
  }

  revalidatePath("/donor");
  revalidatePath("/donor/alerts");
  revalidatePath("/staff/alerts");
}

export async function updateDonorAvailabilityAction(formData: FormData) {
  const { supabase, profile } = await requireRole(["donor", "admin"]);
  const status = String(formData.get("status") ?? "pending_verification");
  if (!DONOR_STATUSES.includes(status as DonorStatus)) {
    return;
  }

  await supabase
    .from("donor_profiles")
    .update({ status })
    .eq("profile_id", profile.id);

  await supabase
    .from("donor_verification_steps")
    .update({ approval_outcome: status })
    .eq("donor_profile_id", profile.id);

  revalidatePath("/donor");
  revalidatePath("/donor/profile");
}
