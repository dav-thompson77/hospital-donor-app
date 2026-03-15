"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";

export async function recordDonationAction(formData: FormData) {
  const { supabase, profile } = await requireRole(["blood_bank_staff", "admin"]);

  const donorProfileId = String(formData.get("donor_profile_id") ?? "").trim();
  const centerId = Number(formData.get("center_id"));
  const appointmentId = formData.get("appointment_id")
    ? Number(formData.get("appointment_id"))
    : null;
  const bloodType = String(formData.get("blood_type") ?? "").trim();
  const donatedAt = String(formData.get("donated_at") ?? "").trim();
  const units = Number(formData.get("units") ?? 1.0);
  const notes = String(formData.get("notes") ?? "").trim();

  if (!donorProfileId || !centerId || !bloodType || !donatedAt) return;

  // Record the donation
  await supabase.from("donation_history").insert({
    donor_profile_id: donorProfileId,
    center_id: centerId,
    appointment_id: appointmentId,
    blood_type: bloodType,
    donated_at: new Date(donatedAt).toISOString(),
    units: units || 1.0,
    notes: notes || null,
  });

  // Update donor's last donation date and next eligible date (56 days later)
  const nextEligible = new Date(donatedAt);
  nextEligible.setDate(nextEligible.getDate() + 56);

  await supabase
    .from("donor_profiles")
    .update({
      last_donation_date: new Date(donatedAt).toISOString().split("T")[0],
      next_eligible_donation_date: nextEligible.toISOString().split("T")[0],
    })
    .eq("profile_id", donorProfileId);

  // Mark linked appointment as completed if one exists
  if (appointmentId) {
    await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", appointmentId);
  }

  // Send notification to donor
  await supabase.from("notifications").insert({
    recipient_profile_id: donorProfileId,
    source_type: "donation",
    source_id: null,
    title: "Donation recorded — thank you!",
    body: `Your ${bloodType} donation has been recorded. You will be eligible to donate again on ${nextEligible.toLocaleDateString("en-JM", { day: "numeric", month: "long", year: "numeric" })}.`,
  });

  revalidatePath("/staff/appointments");
  revalidatePath("/donor/history");
  revalidatePath("/donor");
}