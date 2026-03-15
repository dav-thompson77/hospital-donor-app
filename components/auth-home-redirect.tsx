"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthHomeRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    // Only redirect if there is an auth token in the URL hash
    // This handles email magic link / implicit flow only
    const hasAuthHash =
      window.location.hash.includes("access_token") ||
      window.location.hash.includes("refresh_token");

    if (!hasAuthHash) return;

    const supabase = createClient();
    const settleAuth = async () => {
      await supabase.auth.getSession();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/dashboard");
      }
    };

    void settleAuth();
  }, [pathname, router]);

  return null;
}