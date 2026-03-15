import { createClient } from "@/lib/supabase/server";
import { ensureProfileForUser, getRoleHomePath } from "@/lib/auth";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function safeNextPath(nextValue: string | null) {
  if (!nextValue || !nextValue.startsWith("/")) {
    return "/dashboard";
  }
  if (nextValue.startsWith("/auth")) {
    return "/dashboard";
  }
  return nextValue;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent(error.message)}`,
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent(error.message)}`,
      );
    }
  } else {
    const {
      data: { user: existingUser },
    } = await supabase.auth.getUser();
    if (!existingUser) {
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent(
          "Missing auth callback parameters",
        )}`,
      );
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent("Auth session was not established")}`,
    );
  }

  let rolePath = "/onboarding";
  try {
    const profile = await ensureProfileForUser(supabase, user);
    rolePath = profile.role ? getRoleHomePath(profile.role) : "/onboarding";
  } catch {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  if (next !== "/dashboard") {
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}${rolePath}`);
}
