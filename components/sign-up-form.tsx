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
import type { UserRole } from "@/lib/types";

export function SignUpForm({
  role = "donor",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { role?: UserRole }) {
  const isStaffRole = role === "blood_bank_staff";
  const isDonorRole = role === "donor";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [staffIdNumber, setStaffIdNumber] = useState("");
  const [staffFacility, setStaffFacility] = useState("");
  const [staffWorkPhone, setStaffWorkPhone] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (isDonorRole && !phone.trim()) {
      setError("Phone number is required for donor sign up");
      setIsLoading(false);
      return;
    }

    if (isStaffRole && (!staffIdNumber.trim() || !staffFacility.trim())) {
      setError("Staff ID number and blood bank / facility are required");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getBrowserAuthCallbackUrl(),
          data: {
            full_name: fullName,
            role,
            phone: isDonorRole ? phone.trim() : null,
            staff_id_number: isStaffRole ? staffIdNumber.trim() : null,
            staff_facility: isStaffRole ? staffFacility.trim() : null,
            staff_work_phone: isStaffRole ? (staffWorkPhone.trim() || null) : null,
          },
        },
      });
      if (error) throw error;
      if (data.session) {
        router.push("/dashboard");
      } else {
        router.push("/auth/sign-up-success");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {role === "blood_bank_staff"
              ? "Register blood bank account"
              : "Register donor account"}
          </CardTitle>
          <CardDescription>
            {role === "blood_bank_staff"
              ? "Create staff access for blood request coordination."
              : "Create your donor account to begin screening and appointment booking."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Jane Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
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
              {isDonorRole ? (
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1-876-555-0000"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              ) : null}
              {isStaffRole ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="staff-id-number">Staff ID number</Label>
                    <Input
                      id="staff-id-number"
                      type="text"
                      placeholder="BB-STAFF-001"
                      required
                      value={staffIdNumber}
                      onChange={(e) => setStaffIdNumber(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="staff-facility">Blood bank / facility</Label>
                    <Input
                      id="staff-facility"
                      type="text"
                      placeholder="National Blood Transfusion Service"
                      required
                      value={staffFacility}
                      onChange={(e) => setStaffFacility(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="staff-work-phone">Work phone number (optional)</Label>
                    <Input
                      id="staff-work-phone"
                      type="tel"
                      placeholder="+1-876-555-1000"
                      value={staffWorkPhone}
                      onChange={(e) => setStaffWorkPhone(e.target.value)}
                    />
                  </div>
                </>
              ) : null}
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
