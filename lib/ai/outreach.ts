import type { DonorStatus, UrgencyLevel } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface OutreachInput {
  donorName: string;
  bloodType: string | null;
  urgency: UrgencyLevel;
  requiredBy: string;
  donorStatus: DonorStatus;
  lastDonationDate: string | null;
  centreName: string;
  customNote?: string | null;
}

function urgencyPrefix(urgency: UrgencyLevel) {
  switch (urgency) {
    case "critical":
      return "Urgent support needed";
    case "high":
      return "High-priority blood request";
    case "medium":
      return "Blood request update";
    case "low":
      return "Upcoming donor request";
  }
}

function statusLine(status: DonorStatus) {
  switch (status) {
    case "approved":
      return "You are currently marked as approved to donate.";
    case "eligible_again":
      return "You are marked as eligible to donate again.";
    case "temporarily_deferred":
      return "Your status is temporarily deferred. If your re-screening is complete, please update staff.";
    case "pending_verification":
      return "Your onboarding is still in progress. Staff can guide your next verification step.";
  }
}

export function generateOutreachSuggestions(input: OutreachInput) {
  const lastDonationLine = input.lastDonationDate
    ? `Last donation: ${formatDate(input.lastDonationDate)}.`
    : "No previous donation date is on file.";

  const base = `${urgencyPrefix(input.urgency)} for ${
    input.bloodType ?? "compatible"
  } donors at ${input.centreName}, needed by ${formatDate(input.requiredBy)}.`;

  const note = input.customNote ? `Note from staff: ${input.customNote}` : "";

  return [
    `Hi ${input.donorName}, ${base} ${statusLine(input.donorStatus)} ${lastDonationLine} Reply in Blood Bridge if you are interested.`,
    `Hello ${input.donorName}, we are coordinating a ${
      input.urgency
    } request for ${input.bloodType ?? "blood donors"} at ${
      input.centreName
    }. ${statusLine(input.donorStatus)} ${note}`.trim(),
    `Blood Bridge update: ${
      input.bloodType ?? "donors"
    } needed at ${input.centreName}. Required by ${formatDate(
      input.requiredBy,
    )}. ${lastDonationLine} Please mark Interested, Booked, or Unavailable in your dashboard.`,
  ];
}
