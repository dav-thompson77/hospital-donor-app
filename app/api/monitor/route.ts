import { createClient } from "@/lib/supabase/server";
import { runAIMonitor } from "@/lib/ai/monitor";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Secure the endpoint with a secret key
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.MONITOR_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Get a staff profile to act as the sender
  const { data: staffProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "blood_bank_staff")
    .limit(1)
    .single();

  if (!staffProfile) {
    return NextResponse.json({ error: "No staff profile found" }, { status: 500 });
  }

  const result = await runAIMonitor(supabase, staffProfile.id);

  return NextResponse.json({ success: true, result });
}