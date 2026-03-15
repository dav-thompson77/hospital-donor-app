import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DonorStatus } from "@/lib/types";

interface DonorFilterInput {
  bloodType?: string;
  status?: DonorStatus | "";
  parish?: string;
}

export interface LaunchUrgentRequest {
  id: number;
  blood_type_needed: string;
  urgency: string;
  required_by: string;
  blood_centers:
    | { name: string | null; parish: string | null }
    | Array<{ name: string | null; parish: string | null }>
    | null;
}

export async function getDonorDashboardData(
  supabase: SupabaseClient,
  profileId: string,
) {
  const [
    donorProfileResult,
    verificationResult,
    upcomingAppointmentsResult,
    donationHistoryResult,
    alertsResult,
    notificationsResult,
  ] = await Promise.all([
    supabase.from("donor_profiles").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase
      .from("donor_verification_steps")
      .select("*")
      .eq("donor_profile_id", profileId)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("*, blood_centers(name)")
      .eq("donor_profile_id", profileId)
      .order("scheduled_at", { ascending: true })
      .limit(5),
    supabase
      .from("donation_history")
      .select("*, blood_centers(name)")
      .eq("donor_profile_id", profileId)
      .order("donated_at", { ascending: false })
      .limit(5),
    supabase
      .from("donor_alerts")
      .select("*, blood_requests(blood_type_needed, urgency, required_by), blood_centers:blood_requests(center_id)")
      .eq("donor_profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("notifications")
      .select("id", { count: "exact" })
      .eq("recipient_profile_id", profileId)
      .eq("is_read", false),
  ]);

  return {
    donorProfile: donorProfileResult.data,
    verification: verificationResult.data,
    upcomingAppointments: upcomingAppointmentsResult.data ?? [],
    donationHistory: donationHistoryResult.data ?? [],
    alerts: alertsResult.data ?? [],
    unreadNotifications: notificationsResult.count ?? 0,
  };
}

export async function getBloodCentres(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("blood_centers")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getPublicUrgentRequests(limit = 4): Promise<LaunchUrgentRequest[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return [];
  }

  const publicClient = createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await publicClient
    .from("blood_requests")
    .select("id, blood_type_needed, urgency, required_by, blood_centers(name, parish)")
    .eq("status", "active")
    .order("required_by", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as LaunchUrgentRequest[];
}

export async function getStaffDashboardData(supabase: SupabaseClient) {
  const [activeRequests, approvedDonors, pendingVerification, bookedAppointments, responses] =
    await Promise.all([
      supabase
        .from("blood_requests")
        .select("id", { head: true, count: "exact" })
        .eq("status", "active"),
      supabase
        .from("donor_profiles")
        .select("profile_id", { head: true, count: "exact" })
        .in("status", ["approved", "eligible_again"]),
      supabase
        .from("donor_profiles")
        .select("profile_id", { head: true, count: "exact" })
        .eq("status", "pending_verification"),
      supabase
        .from("appointments")
        .select("id", { head: true, count: "exact" })
        .eq("status", "scheduled"),
      supabase
        .from("donor_alert_responses")
        .select("id", { head: true, count: "exact" })
        .neq("response_status", "pending"),
    ]);

  return {
    activeRequests: activeRequests.count ?? 0,
    approvedDonors: approvedDonors.count ?? 0,
    pendingVerification: pendingVerification.count ?? 0,
    bookedAppointments: bookedAppointments.count ?? 0,
    responsesReceived: responses.count ?? 0,
  };
}

export async function getStaffDonorDirectory(
  supabase: SupabaseClient,
  filters: DonorFilterInput,
) {
  let query = supabase
    .from("donor_profiles")
    .select(
      "profile_id, blood_type, status, next_eligible_donation_date, last_donation_date, profiles!inner(full_name, email, phone, parish)",
    )
    .order("updated_at", { ascending: false });

  if (filters.bloodType) {
    query = query.eq("blood_type", filters.bloodType);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.parish) {
    query = query.eq("profiles.parish", filters.parish);
  }

  const { data, error } = await query.limit(100);
  if (error) {
    throw error;
  }
  return data ?? [];
}
