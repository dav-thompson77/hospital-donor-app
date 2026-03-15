import type { SupabaseClient } from "@supabase/supabase-js";
import { generateOutreachSuggestions } from "@/lib/ai/outreach";
import type { DonorStatus, UrgencyLevel } from "@/lib/types";

const MONITOR_ALERT_COOLDOWN_HOURS = 6;
const ELIGIBILITY_COOLDOWN_DAYS = 56;

interface MonitorRequestRow {
  id: number;
  blood_type_needed: string;
  urgency: UrgencyLevel;
  required_by: string;
  center_id: number;
  note: string | null;
  blood_centers: { name: string } | Array<{ name: string }> | null;
}

interface MatchedDonorRow {
  profile_id: string;
  status: DonorStatus;
  last_donation_date: string | null;
  next_eligible_donation_date: string | null;
  profiles:
    | { full_name: string | null }
    | Array<{ full_name: string | null }>
    | null;
}

export interface MonitorRunDetail {
  requestId: number;
  bloodType: string;
  urgency: UrgencyLevel;
  donorsMatched: number;
  alertsCreated: number;
  deduped: number;
}

export interface MonitorRunResult {
  processedRequests: number;
  alertsCreated: number;
  donorsMatched: number;
  deduped: number;
  details: MonitorRunDetail[];
}

interface MonitorRunInput {
  sentByProfileId: string;
  requestId?: number;
}

function pickCentreName(centre: MonitorRequestRow["blood_centers"]) {
  if (!centre) return "Donation Centre";
  if (Array.isArray(centre)) return centre[0]?.name ?? "Donation Centre";
  return centre.name ?? "Donation Centre";
}

function pickDonorName(profileJoin: MatchedDonorRow["profiles"]) {
  if (!profileJoin) return "donor";
  if (Array.isArray(profileJoin)) return profileJoin[0]?.full_name ?? "donor";
  return profileJoin.full_name ?? "donor";
}

function addDays(dateValue: string, days: number) {
  const base = new Date(dateValue);
  if (Number.isNaN(base.getTime())) {
    return null;
  }
  base.setUTCDate(base.getUTCDate() + days);
  return base;
}

function isDonorEligible(donor: Pick<MatchedDonorRow, "last_donation_date" | "next_eligible_donation_date">) {
  const now = new Date();
  if (donor.next_eligible_donation_date) {
    const nextEligible = new Date(donor.next_eligible_donation_date);
    if (!Number.isNaN(nextEligible.getTime()) && nextEligible > now) {
      return false;
    }
  }

  if (donor.last_donation_date) {
    const eligibleAt = addDays(donor.last_donation_date, ELIGIBILITY_COOLDOWN_DAYS);
    if (eligibleAt && eligibleAt > now) {
      return false;
    }
  }

  return true;
}

export async function runAIMonitor(
  supabase: SupabaseClient,
  input: MonitorRunInput,
): Promise<MonitorRunResult> {
  const requestQuery = supabase
    .from("blood_requests")
    .select("id, blood_type_needed, urgency, required_by, center_id, note, blood_centers(name)")
    .eq("status", "active")
    .eq("urgency", "critical")
    .order("required_by", { ascending: true });

  const { data: requests, error: requestsError } = input.requestId
    ? await requestQuery.eq("id", input.requestId)
    : await requestQuery.limit(10);

  if (requestsError) {
    throw requestsError;
  }

  const requestRows = (requests ?? []) as MonitorRequestRow[];
  const cooldownSince = new Date(Date.now() - MONITOR_ALERT_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();

  const result: MonitorRunResult = {
    processedRequests: 0,
    alertsCreated: 0,
    donorsMatched: 0,
    deduped: 0,
    details: [],
  };

  for (const request of requestRows) {
    result.processedRequests += 1;

    const { data: donors, error: donorsError } = await supabase
      .from("donor_profiles")
      .select(
        "profile_id, status, last_donation_date, next_eligible_donation_date, profiles!inner(full_name)",
      )
      .eq("blood_type", request.blood_type_needed)
      .in("status", ["approved", "eligible_again"]);

    if (donorsError) {
      throw donorsError;
    }

    const eligibleDonors = ((donors ?? []) as MatchedDonorRow[]).filter((donor) =>
      isDonorEligible(donor),
    );

    result.donorsMatched += eligibleDonors.length;

    const { data: recentAlerts, error: recentAlertsError } = await supabase
      .from("donor_alerts")
      .select("donor_profile_id")
      .eq("blood_request_id", request.id)
      .gte("created_at", cooldownSince);

    if (recentAlertsError) {
      throw recentAlertsError;
    }

    const recentlyAlerted = new Set((recentAlerts ?? []).map((row) => row.donor_profile_id));
    const detail: MonitorRunDetail = {
      requestId: request.id,
      bloodType: request.blood_type_needed,
      urgency: request.urgency,
      donorsMatched: eligibleDonors.length,
      alertsCreated: 0,
      deduped: 0,
    };

    for (const donor of eligibleDonors) {
      if (recentlyAlerted.has(donor.profile_id)) {
        detail.deduped += 1;
        result.deduped += 1;
        continue;
      }

      const suggestions = generateOutreachSuggestions({
        donorName: pickDonorName(donor.profiles),
        bloodType: request.blood_type_needed,
        urgency: request.urgency,
        requiredBy: request.required_by,
        donorStatus: donor.status,
        lastDonationDate: donor.last_donation_date,
        centreName: pickCentreName(request.blood_centers),
        customNote: request.note,
      });

      const alertMessage =
        suggestions[0] ??
        `Urgent ${request.blood_type_needed} donation request at ${pickCentreName(request.blood_centers)}.`;

      const { data: alert, error: alertError } = await supabase
        .from("donor_alerts")
        .insert({
          blood_request_id: request.id,
          donor_profile_id: donor.profile_id,
          sent_by_profile_id: input.sentByProfileId,
          message: alertMessage,
        })
        .select("id")
        .single();

      if (alertError || !alert) {
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
        title: "Critical blood request alert",
        body: alertMessage,
      });

      recentlyAlerted.add(donor.profile_id);
      detail.alertsCreated += 1;
      result.alertsCreated += 1;
    }

    result.details.push(detail);
  }

  return result;
}
