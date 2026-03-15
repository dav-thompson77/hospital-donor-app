"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles fallback auth redirects when providers send users to `/`
 * with URL fragments (implicit flow) instead of callback query params.
 */
export function AuthHomeRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const supabase = createClient();

    const settleAuth = async () => {
      await supabase.auth.getSession();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/dashboard");
      }
    };

    // Handles links that return tokens in hash fragments.
    if (
      window.location.hash.includes("access_token") ||
      window.location.hash.includes("refresh_token")
    ) {
      void settleAuth();
    } else {
      // If session already exists, skip landing and enter dashboard.
      void settleAuth();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        router.replace("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  return null;
}
