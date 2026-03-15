"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserAuthCallbackUrl } from "@/lib/site-url";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const router = useRouter();
  const callbackUrlHost = (() => {
    try {
      return new URL(getBrowserAuthCallbackUrl()).host;
    } catch {
      return "your configured app URL";
    }
  })();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Enter your email first to receive a sign-in link.");
      return;
    }

    const supabase = createClient();
    setIsSendingLink(true);
    setError(null);
    setInfo(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getBrowserAuthCallbackUrl(),
        },
      });
      if (error) throw error;
      setInfo("Check your email for a secure sign-in link.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send sign-in link.");
    } finally {
      setIsSendingLink(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Sign in with password or request a secure email login link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {info && <p className="text-sm text-emerald-500">{info}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isSendingLink}
                onClick={handleMagicLink}
              >
                {isSendingLink ? "Sending link..." : "Email me a sign-in link"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up?role=donor"
                className="underline underline-offset-4"
              >
                Sign up as donor
              </Link>
              {" • "}
              <Link
                href="/auth/sign-up?role=blood_bank_staff"
                className="underline underline-offset-4"
              >
                Sign up as blood bank
              </Link>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Email sign-in links return to: <span className="font-medium">{callbackUrlHost}</span>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
