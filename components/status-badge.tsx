import { Badge } from "@/components/ui/badge";
import type {
  AlertResponseStatus,
  AppointmentStatus,
  DonorStatus,
  UrgencyLevel,
} from "@/lib/types";

type AnyStatus =
  | DonorStatus
  | AppointmentStatus
  | AlertResponseStatus
  | UrgencyLevel
  | "active"
  | "fulfilled"
  | "cancelled";

function getVariant(status: AnyStatus) {
  switch (status) {
    case "critical":
    case "temporarily_deferred":
    case "unavailable":
    case "cancelled":
    case "no_show":
      return "destructive" as const;
    case "high":
    case "interested":
    case "pending_verification":
      return "secondary" as const;
    case "booked":
    case "approved":
    case "eligible_again":
    case "active":
    case "scheduled":
    case "completed":
    case "fulfilled":
      return "default" as const;
    case "medium":
    case "low":
    case "pending":
    default:
      return "outline" as const;
  }
}

export function StatusBadge({ status }: { status: AnyStatus | string }) {
  const normalized = status.replaceAll("_", " ");
  return <Badge variant={getVariant(status as AnyStatus)}>{normalized}</Badge>;
}
