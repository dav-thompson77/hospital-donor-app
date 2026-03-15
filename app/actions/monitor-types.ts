import type { MonitorRunResult } from "@/lib/ai/monitor";

export interface MonitorActionState {
  status: "idle" | "success" | "error";
  message: string | null;
  result: MonitorRunResult | null;
}

export const initialMonitorActionState: MonitorActionState = {
  status: "idle",
  message: null,
  result: null,
};
