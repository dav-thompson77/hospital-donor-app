import type { SupabaseClient } from "@supabase/supabase-js";
import type { DonorStatus } from "@/lib/types";

interface DonorFilterInput {
  bloodType?: string;
  status?: DonorStatus | "";
  parish?: string;
}

export interface CenterOption {
  id: number;
  name: string;
  parish: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
}

export const DEFAULT_CENTER_SEED: Array<
  Omit<CenterOption, "id" | "is_active"> & { id?: number; is_active?: boolean }
> = [
  {
    id: 1,
    name: "National Blood Transfusion Service",
    parish: "Kingston",
    address: "21 Slipe Pen Road, Kingston",
    phone: "+1-876-555-3001",
    is_active: true,
  },
  {
    id: 2,
    name: "National Chest Hospital / Kiwanis Blood Collection Centre",
    parish: "Kingston",
    address: "36 Barbican Road, Kingston 6",
    phone: "+1-876-555-3005",
    is_active: true,
  },
  {
    id: 3,
    name: "St. Ann's Bay Hospital",
    parish: "St. Ann",
    address: "15 St. Ann's Bay Main Road, St. Ann's Bay",
    phone: "+1-876-555-3002",
    is_active: true,
  },
  {
    id: 4,
    name: "Savanna-la-Mar Hospital",
    parish: "Westmoreland",
    address: "6 Beckford Street, Savanna-la-Mar",
    phone: "+1-876-555-3003",
    is_active: true,
  },
  {
    id: 5,
    name: "Port Antonio Hospital",
    parish: "Portland",
    address: "West Street, Port Antonio",
    phone: "+1-876-555-3004",
    is_active: true,
  },
];

async function queryCenterOptions(supabase: SupabaseClient): Promise<CenterOption[]> {
  const { data, error } = await supabase
    .from("blood_centers")
    .select("id, name, parish, address, phone, is_active")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).filter((center) => center.is_active !== false);
}

async function queryCenterOptionsMinimal(
  supabase: SupabaseClient,
): Promise<CenterOption[]> {
  const { data, error } = await supabase
    .from("blood_centers")
    .select("id, name, parish")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((center) => ({
    id: Number(center.id),
    name: center.name,
    parish: center.parish,
    address: null,
    phone: null,
    is_active: true,
  }));
}

async function trySeedCentersViaRpc(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("ensure_demo_blood_centers");
  // The RPC may not exist yet if migrations were not applied.
  if (error && !error.message.toLowerCase().includes("ensure_demo_blood_centers")) {
    throw error;
  }
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
  let centers: CenterOption[] = [];
  try {
    centers = await queryCenterOptions(supabase);
    if (centers.length) {
      return centers;
    }
  } catch {
    try {
      centers = await queryCenterOptionsMinimal(supabase);
      if (centers.length) {
        return centers;
      }
    } catch {
      centers = [];
    }
  }

  try {
    await trySeedCentersViaRpc(supabase);
    try {
      centers = await queryCenterOptions(supabase);
      if (centers.length) {
        return centers;
      }
    } catch {
      centers = await queryCenterOptionsMinimal(supabase);
      if (centers.length) {
        return centers;
      }
    }
  } catch {
    // Swallow and return empty list if the RPC is unavailable.
  }

  return [];
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
