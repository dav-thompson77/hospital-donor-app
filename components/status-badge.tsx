import { Badge } from "@/components/ui/badge";
import type {
  AlertResponseStatus,
  AppointmentStatus,
  DonorStatus,
  UrgencyLevel,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type AnyStatus =
  | DonorStatus
  | AppointmentStatus
  | AlertResponseStatus
  | UrgencyLevel
  | "active"
  | "fulfilled"
  | "cancelled";

function getTone(status: AnyStatus) {
  switch (status) {
    case "critical":
    case "temporarily_deferred":
    case "unavailable":
    case "cancelled":
    case "no_show":
      return "destructive" as const;
    case "high":
      return "high-priority" as const;
    case "booked":
    case "approved":
    case "eligible_again":
    case "active":
    case "scheduled":
    case "completed":
    case "fulfilled":
      return "positive" as const;
    case "interested":
      return "info" as const;
    case "pending_verification":
    case "pending":
      return "pending" as const;
    case "medium":
    case "low":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

export function StatusBadge({ status }: { status: AnyStatus | string }) {
  const normalized = status.replaceAll("_", " ");
  const tone = getTone(status as AnyStatus);

  return (
    <Badge
      variant={tone === "destructive" ? "destructive" : "outline"}
      className={cn(
        tone === "positive" &&
          "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
        tone === "info" &&
          "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
        tone === "pending" &&
          "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
        tone === "high-priority" &&
          "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200",
      )}
    >
      {normalized}
    </Badge>
  );
}
