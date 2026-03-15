import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSMSMessages, sendSMS } from "@/lib/sms";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const CRITICAL_THRESHOLD = 3;
const LOW_THRESHOLD = 8;
const SAFE_THRESHOLD = 15;

function getTrendMultiplier(): { factor: number; reason: string } {
  const month = new Date().getMonth() + 1;
  const day = new Date().getDay();

  if (day === 5 || day === 6) {
    return {
      factor: 1.4,
      reason: "Weekend trauma season — road accident volume elevated",
    };
  }
  if ([12, 1, 2, 6, 7, 8].includes(month)) {
    return {
      factor: 1.3,
      reason: "Peak prenatal admission season — O- and A+ demand elevated",
    };
  }
  if ([9, 10].includes(month)) {
    return {
      factor: 1.2,
      reason: "Elective surgery season — all blood types in higher demand",
    };
  }

  return { factor: 1.0, reason: "Normal demand period" };
}

interface BloodTypeInventory {
  bloodType: string;
  eligibleDonors: number;
  recentDonations: number;
  activeRequests: number;
  adjustedThreshold: number;
  isCritical: boolean;
  isLow: boolean;
  isSafe: boolean;
  trendReason: string;
}

export async function analyzeInventory(
  supabase: SupabaseClient
): Promise<BloodTypeInventory[]> {
  const trend = getTrendMultiplier();
  const results: BloodTypeInventory[] = [];

  for (const bloodType of BLOOD_TYPES) {
    const { count: eligibleDonors } = await supabase
      .from("donor_profiles")
      .select("profile_id", { count: "exact", head: true })
      .eq("blood_type", bloodType)
      .in("status", ["approved", "eligible_again"])
      .lte(
        "next_eligible_donation_date",
        new Date().toISOString().split("T")[0]
      );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentDonations } = await supabase
      .from("donation_history")
      .select("id", { count: "exact", head: true })
      .eq("blood_type", bloodType)
      .gte("donated_at", thirtyDaysAgo.toISOString());

    const { count: activeRequests } = await supabase
      .from("blood_requests")
      .select("id", { count: "exact", head: true })
      .eq("blood_type_needed", bloodType)
      .eq("status", "active");

    const donors = eligibleDonors ?? 0;
    const donations = recentDonations ?? 0;
    const requests = activeRequests ?? 0;

    const adjustedThreshold = Math.ceil(
      (CRITICAL_THRESHOLD + requests) * trend.factor
    );

    results.push({
      bloodType,
      eligibleDonors: donors,
      recentDonations: donations,
      activeRequests: requests,
      adjustedThreshold,
      isCritical: donors <= adjustedThreshold,
      isLow:
        donors > adjustedThreshold &&
        donors <= Math.ceil(LOW_THRESHOLD * trend.factor),
      isSafe: donors > Math.ceil(SAFE_THRESHOLD * trend.factor),
      trendReason: trend.reason,
    });
  }

  return results;
}

export async function runAIMonitor(
  supabase: SupabaseClient,
  staffProfileId: string
) {
  // Step 1 — Restore donors whose 56-day window has passed BEFORE analyzing
  await supabase
    .from("donor_profiles")
    .update({ status: "eligible_again" })
    .eq("status", "temporarily_deferred")
    .lte(
      "next_eligible_donation_date",
      new Date().toISOString().split("T")[0]
    );

  // Step 2 — Analyze inventory with updated statuses
  const inventory = await analyzeInventory(supabase);
  const criticalTypes = inventory.filter((i) => i.isCritical);

  if (!criticalTypes.length) {
    return { triggered: 0, message: "All blood types within safe thresholds" };
  }

  let triggered = 0;

  for (const item of criticalTypes) {
    // Skip if we already sent an alert for this blood type in the last 12 hours
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    const { count: recentAlerts } = await supabase
      .from("blood_requests")
      .select("id", { count: "exact", head: true })
      .eq("blood_type_needed", item.bloodType)
      .eq("status", "active")
      .gte("created_at", twelveHoursAgo.toISOString());

    if ((recentAlerts ?? 0) > 0) continue;

    // Get the primary active centre
    const { data: centre } = await supabase
      .from("blood_centers")
      .select("id, name")
      .eq("is_active", true)
      .order("id")
      .limit(1)
      .single();

    if (!centre) continue;

    const requiredBy = new Date();
    requiredBy.setDate(requiredBy.getDate() + 2);
    const requiredByStr = requiredBy.toISOString().split("T")[0];

    const urgency = item.eligibleDonors === 0 ? "critical" : "high";

    // Auto-create the blood request
    const { data: request } = await supabase
      .from("blood_requests")
      .insert({
        created_by_profile_id: staffProfileId,
        blood_type_needed: item.bloodType,
        urgency,
        center_id: centre.id,
        required_by: requiredByStr,
        note: `AI-detected shortage. ${item.trendReason}. Only ${item.eligibleDonors} eligible donor(s) currently available.`,
        ai_message_suggestions: [],
        status: "active",
      })
      .select("id")
      .single();

    if (!request) continue;

    // Find all matching eligible donors
    const { data: matchingDonors } = await supabase
      .from("donor_profiles")
      .select(
        "profile_id, status, last_donation_date, profiles!inner(full_name, phone)"
      )
      .eq("blood_type", item.bloodType)
      .in("status", ["approved", "eligible_again"])
      .limit(50);

    if (!matchingDonors?.length) continue;

    for (const donor of matchingDonors) {
      const profileData = Array.isArray(donor.profiles)
        ? donor.profiles[0]
        : donor.profiles;
      const donorProfile = profileData as {
        full_name: string;
        phone: string | null;
      } | null;

      const donorName = donorProfile?.full_name ?? "donor";
      const phone = donorProfile?.phone ?? null;

      const messages = buildSMSMessages({
        donorName,
        bloodType: item.bloodType,
        centreName: centre.name,
        requiredBy: requiredByStr,
        donorStatus: donor.status,
        lastDonationDate: donor.last_donation_date,
        staffNote: item.trendReason,
      });

      // Create in-app alert
      const { data: alert } = await supabase
        .from("donor_alerts")
        .insert({
          blood_request_id: request.id,
          donor_profile_id: donor.profile_id,
          sent_by_profile_id: staffProfileId,
          message: messages.urgent,
        })
        .select("id")
        .single();

      if (alert) {
        await supabase.from("donor_alert_responses").upsert(
          {
            alert_id: alert.id,
            donor_profile_id: donor.profile_id,
            response_status: "pending",
          },
          { onConflict: "alert_id,donor_profile_id" }
        );

        await supabase.from("notifications").insert({
          recipient_profile_id: donor.profile_id,
          source_type: "alert",
          source_id: alert.id,
          title: `AI Alert: Urgent ${item.bloodType} blood needed`,
          body: messages.urgent,
        });

        // Send SMS if phone number exists
        if (phone) {
          await sendSMS(phone, messages.urgent);
        }
      }
    }

    triggered++;
  }

  return { triggered, criticalTypes };
}