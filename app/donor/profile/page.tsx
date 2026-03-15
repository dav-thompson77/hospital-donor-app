import { updateDonorProfileAction } from "@/app/actions/donor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { BLOOD_TYPES } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const DONATION_ELIGIBILITY_WINDOW_DAYS = 56;

function addDays(value: string, days: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export default async function DonorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  const { supabase, profile } = await requireRole(["donor", "admin"]);
  const [{ data: donorProfile }, { data: latestCompletedDonation }] = await Promise.all([
    supabase.from("donor_profiles").select("*").eq("profile_id", profile.id).maybeSingle(),
    supabase
      .from("appointments")
      .select("scheduled_at")
      .eq("donor_profile_id", profile.id)
      .eq("appointment_type", "donation")
      .eq("status", "completed")
      .order("scheduled_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const lastCompletedDonationDate = latestCompletedDonation?.scheduled_at ?? null;
  const nextEligibleDonationDate = lastCompletedDonationDate
    ? addDays(lastCompletedDonationDate, DONATION_ELIGIBILITY_WINDOW_DAYS)
    : null;
  const eligibilityLabel = !lastCompletedDonationDate
    ? "Complete your first donation to set eligibility."
    : new Date(nextEligibleDonationDate ?? "").getTime() > Date.now()
      ? "Not yet eligible (8-week recovery window)."
      : "Eligible again.";

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card className="border-primary/15">
        <CardHeader>
          <CardTitle>Donor profile</CardTitle>
          <CardDescription>
            Keep your details updated so blood bank staff can contact and schedule you quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Could not save profile</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <form action={updateDonorProfileAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} placeholder="+1-876-555-0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parish">Parish / location</Label>
              <Input
                id="parish"
                name="parish"
                defaultValue={profile.parish ?? ""}
                placeholder="Kingston"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blood_type">Blood type (if known)</Label>
              <select
                id="blood_type"
                name="blood_type"
                defaultValue={donorProfile?.blood_type ?? ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">Unknown</option>
                {BLOOD_TYPES.map((bloodType) => (
                  <option key={bloodType} value={bloodType}>
                    {bloodType}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                defaultValue={donorProfile?.date_of_birth ?? ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="emergency_contact">Emergency contact (optional)</Label>
              <Input
                id="emergency_contact"
                name="emergency_contact"
                defaultValue={donorProfile?.emergency_contact ?? ""}
                placeholder="Name and phone"
              />
            </div>
            <Button type="submit" className="md:col-span-2">
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-primary/15">
        <CardHeader>
          <CardTitle>Eligibility snapshot</CardTitle>
          <CardDescription>This status is set by staff after screening and interview.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current status</span>
            <StatusBadge status={donorProfile?.status ?? "pending_verification"} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last donation</span>
            <span className="text-sm">{formatDate(lastCompletedDonationDate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Next eligible</span>
            <span className="text-sm">{formatDate(nextEligibleDonationDate)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{eligibilityLabel}</p>
          <p className="rounded-md bg-accent p-3 text-xs">
            Blood Bridge does not replace clinical screening. Final approval is managed by blood bank clinicians.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
