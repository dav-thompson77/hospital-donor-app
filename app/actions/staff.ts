"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { generateOutreachSuggestions } from "@/lib/ai/outreach";
import { runAIMonitor } from "@/lib/ai/monitor";
import { redirect } from "next/navigation";
import { BLOOD_TYPES, type AppointmentStatus, type AppointmentType, type DonorStatus, type UrgencyLevel } from "@/lib/types";

const APPOINTMENT_TYPES: AppointmentType[] = ["blood_typing", "screening", "donation"];
const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
];
const DONOR_STATUSES: DonorStatus[] = [
  "pending_verification",
  "approved",
  "temporarily_deferred",
  "eligible_again",
];
const URGENCY_LEVELS: UrgencyLevel[] = ["low", "medium", "high", "critical"];

const DONATION_ELIGIBILITY_WINDOW_DAYS = 56;

function toIsoDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function addDaysIsoDate(isoDate: string, days: number) {
  const base = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) {
    return null;
  }
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export async function createBloodRequestAction(formData: FormData) {
  const { supabase, profile } = await requireRole(["blood_bank_staff", "admin"]);

  const bloodTypeNeeded = String(formData.get("blood_type_needed") ?? "").trim();
  const urgency = String(formData.get("urgency") ?? "medium");
  const centreId = Number(formData.get("center_id"));
  const requiredBy = String(formData.get("required_by") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!bloodTypeNeeded || !Number.isFinite(centreId) || !requiredBy) {
    return;
  }
  if (!URGENCY_LEVELS.includes(urgency as UrgencyLevel)) {
    return;
  }

  const { data: centre } = await supabase
    .from("blood_centers")
    .select("name")
    .eq("id", centreId)
    .maybeSingle();

  const { data: sampleDonor } = await supabase
    .from("donor_profiles")
    .select("profile_id, status, last_donation_date, profiles!inner(full_name)")
    .eq("blood_type", bloodTypeNeeded)
    .in("status", ["approved", "eligible_again", "temporarily_deferred"])
    .limit(1)
    .maybeSingle();

  const suggestions = sampleDonor
    ? generateOutreachSuggestions({
        donorName:
          (sampleDonor.profiles as { full_name?: string } | null)?.full_name ?? "donor",
        bloodType: bloodTypeNeeded,
        urgency: urgency as UrgencyLevel,
        requiredBy,
        donorStatus: sampleDonor.status,
        lastDonationDate: sampleDonor.last_donation_date,
        centreName: centre?.name ?? "the donation centre",
        customNote: note,
      })
    : generateOutreachSuggestions({
        donorName: "donor",
        bloodType: bloodTypeNeeded,
        urgency: urgency as UrgencyLevel,
        requiredBy,
        donorStatus: "approved",
        lastDonationDate: null,
        centreName: centre?.name ?? "the donation centre",
        customNote: note,
      });

  const { data: createdRequest } = await supabase
    .from("blood_requests")
    .insert({
      created_by_profile_id: profile.id,
      blood_type_needed: bloodTypeNeeded,
      urgency,
      center_id: centreId,
      required_by: requiredBy,
      note: note || null,
      ai_message_suggestions: suggestions,
      status: "active",
    })
    .select("id")
    .single();

  if (createdRequest?.id && urgency === "critical") {
    // Auto-run monitor when a new critical request is created.
    await runAIMonitor(supabase, {
      sentByProfileId: profile.id,
      requestId: createdRequest.id,
    });
    revalidatePath("/staff/monitor");
    revalidatePath("/staff/alerts");
    revalidatePath("/donor/alerts");
  }

  revalidatePath("/staff");
  revalidatePath("/staff/requests");
}

export async function createStaffAppointmentAction(formData: FormData) {
  const { supabase, profile } = await requireRole(["blood_bank_staff", "admin"]);
  const donorProfileId = String(formData.get("donor_profile_id") ?? "");
  const centreId = Number(formData.get("center_id"));
  const bloodRequestId = Number(formData.get("blood_request_id"));
  const appointmentType = String(formData.get("appointment_type") ?? "");
  const scheduledAt = String(formData.get("scheduled_at") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!donorProfileId || !Number.isFinite(centreId) || !scheduledAt) {
    return;
  }
  if (!APPOINTMENT_TYPES.includes(appointmentType as AppointmentType)) {
    return;
  }

  await supabase.from("appointments").insert({
    donor_profile_id: donorProfileId,
    created_by_profile_id: profile.id,
    center_id: centreId,
    blood_request_id: Number.isFinite(bloodRequestId) ? bloodRequestId : null,
    appointment_type: appointmentType,
    scheduled_at: new Date(scheduledAt).toISOString(),
    status: "scheduled",
    notes: notes || null,
  });

  await supabase.from("notifications").insert({
    recipient_profile_id: donorProfileId,
    source_type: "appointment",
    source_id: null,
    title: "New appointment scheduled",
    body: `A ${appointmentType.replace("_", " ")} appointment was scheduled for you.`,
  });

  revalidatePath("/staff/appointments");
  revalidatePath("/donor/appointments");
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const { supabase } = await requireRole(["blood_bank_staff", "admin"]);
  const appointmentId = Number(formData.get("appointment_id"));
  const status = String(formData.get("status") ?? "scheduled");

  if (!Number.isFinite(appointmentId) || !APPOINTMENT_STATUSES.includes(status as AppointmentStatus)) {
    return;
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      "id, donor_profile_id, center_id, blood_request_id, appointment_type, status, scheduled_at, notes",
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appointment) {
    return;
  }

  await supabase.from("appointments").update({ status }).eq("id", appointmentId);

  if (appointment.appointment_type === "donation" && status === "completed") {
    const [{ data: donorProfile }, { data: request }] = await Promise.all([
      supabase
        .from("donor_profiles")
        .select("blood_type")
        .eq("profile_id", appointment.donor_profile_id)
        .maybeSingle(),
      appointment.blood_request_id
        ? supabase
            .from("blood_requests")
            .select("blood_type_needed")
            .eq("id", appointment.blood_request_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const donationBloodType = donorProfile?.blood_type ?? request?.blood_type_needed ?? null;
    if (donationBloodType) {
      await supabase.from("donation_history").upsert(
        {
          donor_profile_id: appointment.donor_profile_id,
          center_id: appointment.center_id,
          appointment_id: appointment.id,
          donated_at: appointment.scheduled_at,
          blood_type: donationBloodType,
          notes: appointment.notes || null,
        },
        { onConflict: "appointment_id" },
      );
    }
  }

  if (appointment.appointment_type === "donation") {
    if (appointment.status === "completed" && status !== "completed") {
      await supabase.from("donation_history").delete().eq("appointment_id", appointment.id);
    }

    const { data: latestCompletedDonation } = await supabase
      .from("appointments")
      .select("scheduled_at")
      .eq("donor_profile_id", appointment.donor_profile_id)
      .eq("appointment_type", "donation")
      .eq("status", "completed")
      .order("scheduled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastDonationDate = latestCompletedDonation?.scheduled_at
      ? toIsoDate(latestCompletedDonation.scheduled_at)
      : null;
    const nextEligibleDate = lastDonationDate
      ? addDaysIsoDate(lastDonationDate, DONATION_ELIGIBILITY_WINDOW_DAYS)
      : null;

    await supabase
      .from("donor_profiles")
      .update({
        last_donation_date: lastDonationDate,
        next_eligible_donation_date: nextEligibleDate,
      })
      .eq("profile_id", appointment.donor_profile_id);
  }

  revalidatePath("/staff/appointments");
  revalidatePath("/donor/appointments");
  revalidatePath("/donor");
  revalidatePath("/donor/donations");
  revalidatePath("/donor/profile");
}

export async function updateDonorWorkflowAction(formData: FormData) {
  const { supabase, profile } = await requireRole(["blood_bank_staff", "admin"]);

  const donorProfileId = String(formData.get("donor_profile_id") ?? "");
  const idVerified = formData.get("id_verified") === "on";
  const medicalScreeningCompleted = formData.get("medical_screening_completed") === "on";
  const haemoglobinCheckCompleted = formData.get("haemoglobin_check_completed") === "on";
  const medicalInterviewCompleted = formData.get("medical_interview_completed") === "on";
  const approvalOutcome = String(formData.get("approval_outcome") ?? "pending_verification");

  if (!donorProfileId || !DONOR_STATUSES.includes(approvalOutcome as DonorStatus)) {
    return;
  }

  await supabase.from("donor_verification_steps").upsert(
    {
      donor_profile_id: donorProfileId,
      registered: true,
      id_verified: idVerified,
      medical_screening_completed: medicalScreeningCompleted,
      haemoglobin_check_completed: haemoglobinCheckCompleted,
      medical_interview_completed: medicalInterviewCompleted,
      approval_outcome: approvalOutcome,
      updated_by_profile_id: profile.id,
    },
    { onConflict: "donor_profile_id" },
  );

  await supabase
    .from("donor_profiles")
    .update({ status: approvalOutcome })
    .eq("profile_id", donorProfileId);

  revalidatePath("/staff/donors");
  revalidatePath("/donor");
}

export async function updateDonorBloodTypeAction(formData: FormData) {
  const { supabase } = await requireRole(["blood_bank_staff", "admin"]);

  const donorProfileId = String(formData.get("donor_profile_id") ?? "").trim();
  const bloodTypeValue = String(formData.get("blood_type") ?? "").trim();
  const bloodType = bloodTypeValue === "" ? null : bloodTypeValue;

  if (!donorProfileId) {
    redirect("/staff/donors?error=Invalid%20donor%20selection");
  }

  if (bloodType && !BLOOD_TYPES.includes(bloodType as (typeof BLOOD_TYPES)[number])) {
    redirect("/staff/donors?error=Invalid%20blood%20type");
  }

  const { error } = await supabase
    .from("donor_profiles")
    .update({ blood_type: bloodType })
    .eq("profile_id", donorProfileId);

  if (error) {
    redirect(`/staff/donors?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/staff/donors");
  revalidatePath("/staff/requests");
  revalidatePath("/donor");
  revalidatePath("/donor/profile");
  redirect("/staff/donors?bloodTypeUpdated=1");
}

export async function sendAlertAction(formData: FormData) {
  const { supabase, profile } = await requireRole(["blood_bank_staff", "admin"]);

  const bloodRequestId = Number(formData.get("blood_request_id"));
  const donorProfileId = String(formData.get("donor_profile_id") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!Number.isFinite(bloodRequestId) || !message) {
    return;
  }

  const { data: request } = await supabase
    .from("blood_requests")
    .select("id, blood_type_needed")
    .eq("id", bloodRequestId)
    .maybeSingle();

  if (!request) {
    return;
  }

  let targetDonors: Array<{ profile_id: string }> = [];

  if (donorProfileId) {
    targetDonors = [{ profile_id: donorProfileId }];
  } else {
    const { data } = await supabase
      .from("donor_profiles")
      .select("profile_id")
      .eq("blood_type", request.blood_type_needed)
      .in("status", ["approved", "eligible_again"])
      .limit(100);
    targetDonors = data ?? [];
  }

  if (!targetDonors.length) {
    return;
  }

  for (const donor of targetDonors) {
    const { data: alert } = await supabase
      .from("donor_alerts")
      .insert({
        blood_request_id: bloodRequestId,
        donor_profile_id: donor.profile_id,
        sent_by_profile_id: profile.id,
        message,
      })
      .select("id")
      .single();

    if (!alert) {
      continue;
    }

    await supabase.from("donor_alert_responses").upsert(
      {
        alert_id: alert.id,
        donor_profile_id: donor.profile_id,
        response_status: "pending",
      },
      { onConflict: "alert_id,donor_profile_id" },
    );

    await supabase.from("notifications").insert({
      recipient_profile_id: donor.profile_id,
      source_type: "alert",
      source_id: alert.id,
      title: "New blood donation alert",
      body: message,
    });
  }

  revalidatePath("/staff/alerts");
  revalidatePath("/donor/alerts");
  revalidatePath("/donor");
}

export async function deleteAlertAction(formData: FormData) {
  const { supabase, profile } = await requireRole(["blood_bank_staff", "admin"]);
  const alertId = Number(formData.get("alert_id"));

  if (!Number.isFinite(alertId)) {
    redirect("/staff/alerts?error=Invalid%20alert%20selection");
  }

  const { data: alert, error: alertLookupError } = await supabase
    .from("donor_alerts")
    .select("id, sent_by_profile_id")
    .eq("id", alertId)
    .maybeSingle();

  if (alertLookupError) {
    redirect(`/staff/alerts?error=${encodeURIComponent(alertLookupError.message)}`);
  }

  if (!alert) {
    redirect("/staff/alerts?error=Alert%20not%20found");
  }

  if (profile.role === "blood_bank_staff" && alert.sent_by_profile_id !== profile.id) {
    redirect("/staff/alerts?error=You%20can%20only%20delete%20alerts%20you%20sent");
  }

  const { error: notificationsDeleteError } = await supabase
    .from("notifications")
    .delete()
    .eq("source_type", "alert")
    .eq("source_id", alertId);

  if (notificationsDeleteError) {
    redirect(`/staff/alerts?error=${encodeURIComponent(notificationsDeleteError.message)}`);
  }

  const { error: deleteAlertError } = await supabase
    .from("donor_alerts")
    .delete()
    .eq("id", alertId);

  if (deleteAlertError) {
    redirect(`/staff/alerts?error=${encodeURIComponent(deleteAlertError.message)}`);
  }

  revalidatePath("/staff/alerts");
  revalidatePath("/donor/alerts");
  revalidatePath("/donor");
  redirect("/staff/alerts?deleted=1");
}
