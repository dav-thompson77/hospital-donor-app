import { updateDonorWorkflowAction } from "@/app/actions/staff";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/auth";
import { BLOOD_TYPES } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface SearchParams {
  blood_type?: string;
  status?: string;
  parish?: string;
  last_donation_before?: string;
  response_status?: string;
}

function pickProfile(row: {
  profiles:
    | {
        full_name: string;
        email: string;
        phone: string | null;
        parish: string | null;
      }
    | Array<{
        full_name: string;
        email: string;
        phone: string | null;
        parish: string | null;
      }>;
}) {
  return Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
}

export default async function StaffDonorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { supabase } = await requireRole(["blood_bank_staff", "admin"]);
  const filters = await searchParams;

  let query = supabase
    .from("donor_profiles")
    .select(
      "profile_id, blood_type, status, last_donation_date, next_eligible_donation_date, profiles!inner(full_name, email, phone, parish)",
    )
    .order("updated_at", { ascending: false });

  if (filters.blood_type) {
    query = query.eq("blood_type", filters.blood_type);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.parish) {
    query = query.ilike("profiles.parish", `%${filters.parish}%`);
  }
  if (filters.last_donation_before) {
    query = query.lte("last_donation_date", filters.last_donation_before);
  }

  const { data: rawDonors } = await query.limit(100);
  const donors = rawDonors ?? [];
  const donorIds = donors.map((donor) => donor.profile_id);

  const [stepsResult, responseResult] = await Promise.all([
    donorIds.length
      ? supabase
          .from("donor_verification_steps")
          .select("*")
          .in("donor_profile_id", donorIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    donorIds.length
      ? supabase
          .from("donor_alert_responses")
          .select("donor_profile_id, response_status, responded_at")
          .in("donor_profile_id", donorIds)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const stepsData = (stepsResult.data ?? []) as Array<{
    donor_profile_id: string;
    id_verified: boolean;
    medical_screening_completed: boolean;
    haemoglobin_check_completed: boolean;
    medical_interview_completed: boolean;
    approval_outcome: string;
  }>;
  const responseData = (responseResult.data ?? []) as Array<{
    donor_profile_id: string;
    response_status: string;
    responded_at: string | null;
  }>;

  const stepsByDonor = new Map<string, (typeof stepsData)[number]>();
  for (const step of stepsData) {
    stepsByDonor.set(step.donor_profile_id, step);
  }

  const latestResponseByDonor = new Map<
    string,
    { response_status: string; responded_at: string | null }
  >();
  for (const response of responseData) {
    if (!latestResponseByDonor.has(response.donor_profile_id)) {
      latestResponseByDonor.set(response.donor_profile_id, {
        response_status: response.response_status,
        responded_at: response.responded_at,
      });
    }
  }

  const responseStatusFilter = filters.response_status;
  const filteredDonors = responseStatusFilter
    ? donors.filter(
        (donor) => latestResponseByDonor.get(donor.profile_id)?.response_status === responseStatusFilter,
      )
    : donors;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Donor directory</CardTitle>
          <CardDescription>
            Search by blood type, approval status, location, last donation date, and response history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="blood_type">Blood type</Label>
              <select
                id="blood_type"
                name="blood_type"
                defaultValue={filters.blood_type ?? ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">All</option>
                {BLOOD_TYPES.map((bloodType) => (
                  <option key={bloodType} value={bloodType}>
                    {bloodType}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={filters.status ?? ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">All</option>
                <option value="pending_verification">pending_verification</option>
                <option value="approved">approved</option>
                <option value="temporarily_deferred">temporarily_deferred</option>
                <option value="eligible_again">eligible_again</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parish">Location</Label>
              <Input id="parish" name="parish" defaultValue={filters.parish ?? ""} placeholder="Kingston" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_donation_before">Last donation before</Label>
              <Input
                id="last_donation_before"
                name="last_donation_before"
                type="date"
                defaultValue={filters.last_donation_before ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="response_status">Response history</Label>
              <select
                id="response_status"
                name="response_status"
                defaultValue={filters.response_status ?? ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">All</option>
                <option value="interested">interested</option>
                <option value="booked">booked</option>
                <option value="unavailable">unavailable</option>
                <option value="pending">pending</option>
              </select>
            </div>
            <Button type="submit" className="md:col-span-5">
              Apply filters
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Donor records</CardTitle>
          <CardDescription>{filteredDonors.length} donors found.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredDonors.length ? (
            filteredDonors.map((donor) => {
              const profile = pickProfile(donor);
              const steps = stepsByDonor.get(donor.profile_id);
              const latestResponse = latestResponseByDonor.get(donor.profile_id);

              return (
                <div key={donor.profile_id} className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{profile?.full_name ?? "Unknown donor"}</p>
                      <p className="text-xs text-muted-foreground">
                        {profile?.email} • {profile?.phone ?? "No phone"} • {profile?.parish ?? "No parish"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={donor.status} />
                      <StatusBadge status={donor.blood_type ?? "pending"} />
                    </div>
                  </div>

                  <p className="mb-3 text-xs text-muted-foreground">
                    Last donation: {formatDate(donor.last_donation_date)} | Next eligible:{" "}
                    {formatDate(donor.next_eligible_donation_date)} | Latest response:{" "}
                    {latestResponse ? `${latestResponse.response_status}` : "none"}
                  </p>

                  <form action={updateDonorWorkflowAction} className="grid gap-3 md:grid-cols-3">
                    <input type="hidden" name="donor_profile_id" value={donor.profile_id} />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="id_verified" defaultChecked={Boolean(steps?.id_verified)} />
                      ID verified
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="medical_screening_completed"
                        defaultChecked={Boolean(steps?.medical_screening_completed)}
                      />
                      Medical screening
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="haemoglobin_check_completed"
                        defaultChecked={Boolean(steps?.haemoglobin_check_completed)}
                      />
                      Haemoglobin check
                    </label>
                    <label className="flex items-center gap-2 text-sm md:col-span-2">
                      <input
                        type="checkbox"
                        name="medical_interview_completed"
                        defaultChecked={Boolean(steps?.medical_interview_completed)}
                      />
                      Medical interview completed
                    </label>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`approval-${donor.profile_id}`}>Approval outcome</Label>
                      <select
                        id={`approval-${donor.profile_id}`}
                        name="approval_outcome"
                        defaultValue={steps?.approval_outcome ?? donor.status}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                      >
                        <option value="pending_verification">pending_verification</option>
                        <option value="approved">approved</option>
                        <option value="temporarily_deferred">temporarily_deferred</option>
                        <option value="eligible_again">eligible_again</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button type="submit">Update workflow</Button>
                    </div>
                  </form>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No donors match the selected filters.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
