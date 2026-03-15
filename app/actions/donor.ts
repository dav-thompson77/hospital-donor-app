"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
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

  try {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || profile.full_name,
        phone: phone || null,
        parish: parish || null,
      })
      .eq("id", profile.id);

    if (profileError) {
      throw profileError;
    }

    const { error: donorProfileError } = await supabase.from("donor_profiles").upsert(
      {
        profile_id: profile.id,
        blood_type: bloodType || null,
        date_of_birth: dateOfBirth || null,
        emergency_contact: emergencyContact || null,
      },
      { onConflict: "profile_id" },
    );

    if (donorProfileError) {
      throw donorProfileError;
    }

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Profile could not be saved. Please try again.";
    redirect(`/donor/profile?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/donor");
  revalidatePath("/donor/profile");
  redirect("/donor?profileUpdated=1");
}

export async function bookDonorAppointmentAction(formData: FormData) {
  const { supabase, profile } = await requireRole(["donor"]);

  const centreId = Number(formData.get("center_id"));
  const appointmentType = String(formData.get("appointment_type"));
  const scheduledAt = String(formData.get("scheduled_at") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!Number.isFinite(centreId) || !APPOINTMENT_TYPES.includes(appointmentType as AppointmentType) || !scheduledAt) {
    redirect("/donor/appointments?error=Please%20complete%20all%20required%20appointment%20fields");
  }

  const { error } = await supabase.from("appointments").insert({
    donor_profile_id: profile.id,
    created_by_profile_id: profile.id,
    center_id: centreId,
    appointment_type: appointmentType,
    scheduled_at: new Date(scheduledAt).toISOString(),
    status: "scheduled",
    notes: notes || null,
  });

  if (error) {
    redirect(`/donor/appointments?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/donor");
  revalidatePath("/donor/appointments");
  redirect("/donor/appointments?saved=1");
}

export async function respondToAlertAction(formData: FormData) {
  const { supabase, profile } = await requireRole(["donor"]);

  const alertId = Number(formData.get("alert_id"));
  const response = String(formData.get("response_status") ?? "pending");
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isFinite(alertId) || !RESPONSE_STATUSES.includes(response as AlertResponseStatus)) {
    redirect("/donor/alerts?error=Invalid%20alert%20response");
  }

  const { error: responseError } = await supabase
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

  if (responseError) {
    redirect(`/donor/alerts?error=${encodeURIComponent(responseError.message)}`);
  }

  if (response === "booked") {
    const { error: notificationError } = await supabase.from("notifications").insert({
      recipient_profile_id: profile.id,
      source_type: "alert_response",
      source_id: alertId,
      title: "Response received",
      body: "Your booked response was submitted. Staff will confirm your slot.",
    });
    if (notificationError) {
      redirect(`/donor/alerts?error=${encodeURIComponent(notificationError.message)}`);
    }
  }

  revalidatePath("/donor");
  revalidatePath("/donor/alerts");
  revalidatePath("/staff");
  revalidatePath("/staff/alerts");
  redirect(`/donor/alerts?saved=1&alert=${alertId}`);
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
