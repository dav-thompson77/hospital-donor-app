"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { runAIMonitor } from "@/lib/ai/monitor";

export async function triggerAIMonitorNowAction() {
  try {
    const { supabase, profile } = await requireRole(["blood_bank_staff", "admin"]);
    const result = await runAIMonitor(supabase, { sentByProfileId: profile.id });

    revalidatePath("/staff/monitor");
    revalidatePath("/staff/alerts");
    revalidatePath("/donor");
    revalidatePath("/donor/alerts");

    const params = new URLSearchParams({
      ran: "1",
      processed: String(result.processedRequests),
      matched: String(result.donorsMatched),
      created: String(result.alertsCreated),
      deduped: String(result.deduped),
    });

    if (!result.processedRequests) {
      params.set("message", "No critical requests found to process.");
    } else if (!result.alertsCreated && !result.donorsMatched) {
      params.set("message", "No matching eligible donors found for critical requests.");
    } else if (!result.alertsCreated && result.deduped > 0) {
      params.set("message", "No new alerts were created due to cooldown deduping.");
    } else if (result.alertsCreated > 0) {
      params.set("message", `${result.alertsCreated} donor alerts were created.`);
    }

    redirect(`/staff/monitor?${params.toString()}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI monitor failed. Please try again.";
    redirect(`/staff/monitor?error=${encodeURIComponent(message)}`);
  }
}
