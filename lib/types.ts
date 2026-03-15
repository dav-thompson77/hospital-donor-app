export type UserRole = "donor" | "blood_bank_staff" | "admin";
export type DonorStatus =
  | "pending_verification"
  | "approved"
  | "temporarily_deferred"
  | "eligible_again";
export type AppointmentType = "blood_typing" | "screening" | "donation";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type UrgencyLevel = "low" | "medium" | "high" | "critical";
export type AlertResponseStatus = "pending" | "interested" | "booked" | "unavailable";

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export interface Profile {
  id: string;
  auth_user_id: string | null;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  parish: string | null;
  created_at: string;
  updated_at: string;
}

export interface DonorProfile {
  profile_id: string;
  blood_type: string | null;
  date_of_birth: string | null;
  emergency_contact: string | null;
  status: DonorStatus;
  next_eligible_donation_date: string | null;
  last_donation_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationSteps {
  donor_profile_id: string;
  registered: boolean;
  id_verified: boolean;
  medical_screening_completed: boolean;
  haemoglobin_check_completed: boolean;
  medical_interview_completed: boolean;
  approval_outcome: DonorStatus;
  updated_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
}
