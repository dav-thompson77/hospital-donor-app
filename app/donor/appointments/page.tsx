import { bookDonorAppointmentAction } from "@/app/actions/donor";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

function centreNameFromJoin(
  centre: { name: string; parish: string } | Array<{ name: string; parish: string }> | null | undefined,
) {
  if (!centre) {
    return "Unknown centre";
  }
  if (Array.isArray(centre)) {
    return centre[0]?.name ?? "Unknown centre";
  }
  return centre.name ?? "Unknown centre";
}

export default async function DonorAppointmentsPage() {
  const { supabase, profile } = await requireRole(["donor", "admin"]);

  const [centresResult, appointmentsResult] = await Promise.all([
    supabase.from("blood_centers").select("id, name, parish").eq("is_active", true).order("name"),
    supabase
      .from("appointments")
      .select("id, appointment_type, status, scheduled_at, notes, blood_centers(name, parish)")
      .eq("donor_profile_id", profile.id)
      .order("scheduled_at", { ascending: true }),
  ]);

  const centres = centresResult.data ?? [];
  const appointments = appointmentsResult.data ?? [];

  return (
    <>
      <RealtimeRefresher donorProfileId={profile.id} />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Book appointment</CardTitle>
            <CardDescription>Schedule blood typing, screening, or donation appointments.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={bookDonorAppointmentAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="center_id">Donation centre</Label>
                <select
                  id="center_id"
                  name="center_id"
                  required
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                >
                  <option value="">Select a centre</option>
                  {centres.map((centre) => (
                    <option key={centre.id} value={centre.id}>
                      {centre.name} ({centre.parish})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment_type">Appointment type</Label>
                <select
                  id="appointment_type"
                  name="appointment_type"
                  required
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                >
                  <option value="blood_typing">Blood typing</option>
                  <option value="screening">Screening</option>
                  <option value="donation">Donation</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Preferred date/time</Label>
                <Input id="scheduled_at" name="scheduled_at" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input id="notes" name="notes" placeholder="Availability details" />
              </div>
              <Button type="submit" className="w-full">
                Book appointment
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment history</CardTitle>
            <CardDescription>Track your scheduled and completed appointments.</CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Centre</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="capitalize">
                        {appointment.appointment_type.replaceAll("_", " ")}
                      </TableCell>
                      <TableCell>{centreNameFromJoin(appointment.blood_centers)}</TableCell>
                      <TableCell>{formatDateTime(appointment.scheduled_at)}</TableCell>
                      <TableCell>
                        <StatusBadge status={appointment.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No appointments yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
