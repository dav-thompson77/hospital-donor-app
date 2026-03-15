import {
  createStaffAppointmentAction,
  updateAppointmentStatusAction,
} from "@/app/actions/staff";
import { recordDonationAction } from "@/app/actions/donations";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/auth";
import { getBloodCentres } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

function getProfileName(
  profile:
    | { full_name: string | null }
    | Array<{ full_name: string | null }>
    | null
    | undefined,
) {
  if (!profile) return "Unknown donor";
  if (Array.isArray(profile)) return profile[0]?.full_name ?? "Unknown donor";
  return profile.full_name ?? "Unknown donor";
}

function centreNameFromJoin(
  centre: { name: string } | Array<{ name: string }> | null | undefined,
) {
  if (!centre) return "Unknown centre";
  if (Array.isArray(centre)) return centre[0]?.name ?? "Unknown centre";
  return centre.name ?? "Unknown centre";
}

export default async function StaffAppointmentsPage() {
  const { supabase } = await requireRole(["blood_bank_staff", "admin"]);

  const [donorsResult, centresResult, requestsResult, appointmentsResult] = await Promise.all([
    supabase
      .from("donor_profiles")
      .select("profile_id, blood_type, profiles!inner(full_name)")
      .order("updated_at", { ascending: false })
      .limit(100),
    getBloodCentres(supabase),
    supabase
      .from("blood_requests")
      .select("id, blood_type_needed, urgency, status")
      .eq("status", "active")
      .order("required_by"),
    supabase
      .from("appointments")
      .select(
        "id, appointment_type, status, scheduled_at, notes, donor_profile_id, blood_request_id, blood_centers(name), donor_profiles(profile_id, profiles(full_name))",
      )
      .order("scheduled_at", { ascending: true }),
  ]);

  const donors = donorsResult.data ?? [];
  const centres = centresResult;
  const requests = requestsResult.data ?? [];
  const appointments = appointmentsResult.data ?? [];
  const hasCentres = centres.length > 0;

  return (
    <div className="space-y-6">

      {/* Record completed donation */}
      <Card>
        <CardHeader>
          <CardTitle>Record completed donation</CardTitle>
          <CardDescription>
            Log a donation after it has taken place. This updates the donor
            profile, next eligible date, and donation history automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={recordDonationAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="record_donor_profile_id">Donor</Label>
              <select
                id="record_donor_profile_id"
                name="donor_profile_id"
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">Select donor</option>
                {donors.map((donor) => (
                  <option key={donor.profile_id} value={donor.profile_id}>
                    {getProfileName(donor.profiles)} ({donor.blood_type ?? "unknown"})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="record_center_id">Centre where donation occurred</Label>
              <select
                id="record_center_id"
                name="center_id"
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">Select centre</option>
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.name} ({centre.parish})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="record_blood_type">Blood type donated</Label>
              <select
                id="record_blood_type"
                name="blood_type"
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="record_donated_at">Date and time of donation</Label>
              <Input
                id="record_donated_at"
                name="donated_at"
                type="datetime-local"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="record_units">Units donated</Label>
              <Input
                id="record_units"
                name="units"
                type="number"
                step="0.1"
                defaultValue="1.0"
                min="0.5"
                max="2.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="record_notes">Notes</Label>
              <Input
                id="record_notes"
                name="notes"
                placeholder="Any observations or notes"
              />
            </div>
            <Button
              type="submit"
              className="md:col-span-2 bg-red-600 hover:bg-red-700 text-white"
            >
              Record donation
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Create appointment */}
      <Card>
        <CardHeader>
          <CardTitle>Create appointment</CardTitle>
          <CardDescription>
            Schedule blood typing, screening, or donation for a selected donor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createStaffAppointmentAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="donor_profile_id">Donor</Label>
              <select
                id="donor_profile_id"
                name="donor_profile_id"
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">Select donor</option>
                {donors.map((donor) => (
                  <option key={donor.profile_id} value={donor.profile_id}>
                    {getProfileName(donor.profiles)} ({donor.blood_type ?? "unknown"})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="center_id">Centre</Label>
              <select
                id="center_id"
                name="center_id"
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">Select centre</option>
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.name} ({centre.parish})
                  </option>
                ))}
              </select>
              {!hasCentres ? (
                <p className="text-xs text-destructive">
                  No active donation centres found. Seed centres in Supabase to continue.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="blood_request_id">Link to request (optional)</Label>
              <select
                id="blood_request_id"
                name="blood_request_id"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">None</option>
                {requests.map((request) => (
                  <option key={request.id} value={request.id}>
                    #{request.id} {request.blood_type_needed} ({request.urgency})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointment_type">Type</Label>
              <select
                id="appointment_type"
                name="appointment_type"
                defaultValue="screening"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="blood_typing">Blood typing</option>
                <option value="screening">Screening</option>
                <option value="donation">Donation</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Date / time</Label>
              <Input
                id="scheduled_at"
                name="scheduled_at"
                type="datetime-local"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="Pre-appointment notes" />
            </div>
            <Button type="submit" className="md:col-span-2" disabled={!hasCentres}>
              Create appointment
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Manage appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Manage appointments</CardTitle>
          <CardDescription>
            Update appointment outcomes as donors progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointments.length ? (
            appointments.map((appointment) => {
              const donorProfile = Array.isArray(appointment.donor_profiles)
                ? appointment.donor_profiles[0]
                : appointment.donor_profiles;

              return (
                <div key={appointment.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {appointment.appointment_type.replaceAll("_", " ")} •{" "}
                      {getProfileName(donorProfile?.profiles)}
                    </p>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    {formatDateTime(appointment.scheduled_at)} •{" "}
                    {centreNameFromJoin(appointment.blood_centers)}
                  </p>
                  {appointment.notes ? (
                    <p className="mb-3 text-sm text-muted-foreground">
                      {appointment.notes}
                    </p>
                  ) : null}
                  <form
                    action={updateAppointmentStatusAction}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="hidden"
                      name="appointment_id"
                      value={appointment.id}
                    />
                    <select
                      name="status"
                      defaultValue={appointment.status}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No show</option>
                    </select>
                    <Button type="submit" size="sm">
                      Update status
                    </Button>
                  </form>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              No appointments scheduled.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}