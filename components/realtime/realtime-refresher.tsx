"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  donorAlertsChannel,
  donorAppointmentsChannel,
  staffResponsesChannel,
} from "@/lib/realtime";

interface RealtimeRefresherProps {
  donorProfileId?: string;
  watchStaffResponses?: boolean;
}

export function RealtimeRefresher({
  donorProfileId,
  watchStaffResponses = false,
}: RealtimeRefresherProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    if (donorProfileId) {
      const alerts = supabase
        .channel(donorAlertsChannel(donorProfileId))
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "donor_alerts",
            filter: `donor_profile_id=eq.${donorProfileId}`,
          },
          () => router.refresh(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "donor_alert_responses",
            filter: `donor_profile_id=eq.${donorProfileId}`,
          },
          () => router.refresh(),
        )
        .subscribe();
      channels.push(alerts);

      const appointments = supabase
        .channel(donorAppointmentsChannel(donorProfileId))
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "appointments",
            filter: `donor_profile_id=eq.${donorProfileId}`,
          },
          () => router.refresh(),
        )
        .subscribe();
      channels.push(appointments);
    }

    if (watchStaffResponses) {
      const responses = supabase
        .channel(staffResponsesChannel())
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "donor_alert_responses",
          },
          () => router.refresh(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "donor_alerts",
          },
          () => router.refresh(),
        )
        .subscribe();
      channels.push(responses);
    }

    return () => {
      for (const channel of channels) {
        supabase.removeChannel(channel);
      }
    };
  }, [donorProfileId, router, watchStaffResponses]);

  return null;
}
