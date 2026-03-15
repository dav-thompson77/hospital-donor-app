import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default async function DonorDonationHistoryPage() {
  const { supabase, profile } = await requireRole(["donor", "admin"]);

  const { data: donations } = await supabase
    .from("donation_history")
    .select("id, donated_at, blood_type, units, notes, blood_centers(name, parish)")
    .eq("donor_profile_id", profile.id)
    .order("donated_at", { ascending: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Donation history</CardTitle>
        <CardDescription>Your previous completed donations and centres.</CardDescription>
      </CardHeader>
      <CardContent>
        {donations?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Centre</TableHead>
                <TableHead>Blood type</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell>{formatDateTime(donation.donated_at)}</TableCell>
                  <TableCell>{centreNameFromJoin(donation.blood_centers)}</TableCell>
                  <TableCell>{donation.blood_type}</TableCell>
                  <TableCell>{donation.units}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {donation.notes ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No donation records yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
