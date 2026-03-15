"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { generateOpenRouterOutreachSuggestions } from "@/lib/ai/openrouter";
import { sendSmsMessage } from "@/lib/notifications/sms";
import { redirect } from "next/navigation";
import type { AppointmentStatus, AppointmentType, DonorStatus, UrgencyLevel } from "@/lib/types";

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

function getNameAndPhoneFromJoin(
  profileJoin:
    | {
        full_name: string | null;
        phone: string | null;
        email?: string | null;
        auth_user_id?: string | null;
      }
    | Array<{
        full_name: string | null;
        phone: string | null;
        email?: string | null;
        auth_user_id?: string | null;
      }>
    | null
    | undefined,
) {
  if (!profileJoin) {
    return { fullName: "Donor", phone: null, email: null, authUserId: null };
  }
  const row = Array.isArray(profileJoin) ? profileJoin[0] : profileJoin;
  return {
    fullName: row?.full_name?.trim() || "Donor",
    phone: row?.phone ?? null,
    email: row?.email ?? null,
    authUserId: row?.auth_user_id ?? null,
  };
}

function makePersonalizedOutreachMessage(baseSuggestion: string, donorName: string) {
  const cleaned = baseSuggestion.replace(/^URGENT OUTREACH:\s*/i, "").trim();
  if (cleaned.toLowerCase().includes(donorName.toLowerCase())) {
    return cleaned;
  }
  return `Hello ${donorName}, ${cleaned}`;
}

function isLikelyDemoPhone(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits.includes("555");
}

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
    redirect("/staff/requests?error=Please%20complete%20all%20required%20fields");
  }
  if (!URGENCY_LEVELS.includes(urgency as UrgencyLevel)) {
    redirect("/staff/requests?error=Invalid%20urgency%20value");
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

  const outreachResult = await generateOpenRouterOutreachSuggestions({
    donorName:
      (sampleDonor?.profiles as { full_name?: string } | null)?.full_name ?? "donor",
    bloodType: bloodTypeNeeded,
    urgency: urgency as UrgencyLevel,
    requiredBy,
    approvalStatus: sampleDonor?.status ?? "approved",
    centreName: centre?.name ?? "the donation centre",
    messageContext: note,
  });

  const suggestions = outreachResult.suggestions;

  const { data: requestRow, error: insertError } = await supabase
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

  if (insertError) {
    redirect(`/staff/requests?error=${encodeURIComponent(insertError.message)}`);
  }

  if (!requestRow?.id) {
    redirect("/staff/requests?error=Could%20not%20create%20blood%20request");
  }

  const { data: matchedDonors } = await supabase
    .from("donor_profiles")
    .select("profile_id, status, profiles!inner(full_name, phone, email, auth_user_id)")
    .eq("blood_type", bloodTypeNeeded)
    .in("status", [
      "approved",
      "eligible_again",
      "pending_verification",
      "temporarily_deferred",
    ])
    .limit(100);

  let donorsForDispatch = matchedDonors ?? [];

  if (!donorsForDispatch.length) {
    const { data: fallbackDonors } = await supabase
      .from("donor_profiles")
      .select("profile_id, status, profiles!inner(full_name, phone, email, auth_user_id)")
      .in("status", [
        "approved",
        "eligible_again",
        "pending_verification",
        "temporarily_deferred",
      ])
      .limit(100);

    donorsForDispatch = fallbackDonors ?? [];
  }

  let alertsSent = 0;
  let smsSent = 0;
  let smsFailed = 0;
  let smsWarning = "";
  const baseSuggestion = suggestions[0] ?? `${bloodTypeNeeded} donors needed at ${centre?.name ?? "the centre"}.`;

  for (const donor of donorsForDispatch) {
    const recipient = getNameAndPhoneFromJoin(
      donor.profiles as
        | {
            full_name: string | null;
            phone: string | null;
            email?: string | null;
            auth_user_id?: string | null;
          }
        | Array<{
            full_name: string | null;
            phone: string | null;
            email?: string | null;
            auth_user_id?: string | null;
          }>
        | null
        | undefined,
    );

    if (!recipient.authUserId) {
      continue;
    }

    const personalizedMessage = makePersonalizedOutreachMessage(
      baseSuggestion,
      recipient.fullName,
    );

    const { data: alert, error: alertError } = await supabase
      .from("donor_alerts")
      .insert({
        blood_request_id: requestRow.id,
        donor_profile_id: donor.profile_id,
        sent_by_profile_id: profile.id,
        message: personalizedMessage,
      })
      .select("id")
      .single();

    if (alertError || !alert) {
      continue;
    }

    alertsSent += 1;

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
      body: personalizedMessage,
    });

    if (recipient.phone && !isLikelyDemoPhone(recipient.phone)) {
      const smsResult = await sendSmsMessage({
        to: recipient.phone,
        body: personalizedMessage,
      });
      if (smsResult.ok) {
        smsSent += 1;
      } else {
        smsFailed += 1;
        if (!smsWarning && smsResult.error) {
          smsWarning = smsResult.error.slice(0, 180);
        }
      }
    } else {
      smsFailed += 1;
      if (!smsWarning) {
        smsWarning =
          "Some matched donors have missing/demo phone numbers, so SMS was skipped for those records.";
      }
    }
  }

  revalidatePath("/staff");
  revalidatePath("/staff/requests");
  revalidatePath("/staff/alerts");
  revalidatePath("/donor/alerts");
  const next = new URLSearchParams({
    saved: "1",
    alerts: String(alertsSent),
    smsSent: String(smsSent),
    smsFailed: String(smsFailed),
  });
  if (smsWarning) {
    next.set("smsWarning", smsWarning);
  }
  redirect(`/staff/requests?${next.toString()}`);
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
