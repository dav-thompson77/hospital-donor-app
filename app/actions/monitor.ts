"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { runAIMonitor } from "@/lib/ai/monitor";
import type { MonitorActionState } from "@/app/actions/monitor-types";

export async function triggerAIMonitorNowAction(
  _previousState: MonitorActionState,
  _formData: FormData,
): Promise<MonitorActionState> {
  try {
    void _previousState;
    void _formData;

    const { supabase, profile } = await requireRole(["blood_bank_staff", "admin"]);

    const result = await runAIMonitor(supabase, { sentByProfileId: profile.id });

    revalidatePath("/staff/monitor");
    revalidatePath("/staff/alerts");
    revalidatePath("/donor");
    revalidatePath("/donor/alerts");

    if (!result.processedRequests) {
      return {
        status: "success",
        message: "No active critical requests were found to process.",
        result,
      };
    }

    if (!result.alertsCreated && !result.donorsMatched) {
      return {
        status: "success",
        message: "No eligible matching donors were found for current critical requests.",
        result,
      };
    }

    if (!result.alertsCreated && result.deduped > 0) {
      return {
        status: "success",
        message:
          "Monitor ran successfully, but no new alerts were created because matching donors were recently alerted.",
        result,
      };
    }

    return {
      status: "success",
      message: `Monitor ran successfully and created ${result.alertsCreated} donor alert(s).`,
      result,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "AI monitor failed. Please try again.",
      result: null,
    };
  }
}
