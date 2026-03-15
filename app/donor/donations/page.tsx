import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    .select("id, donated_at, blood_type, units, notes, blood_centres(name, parish)")
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Date</th>
                  <th className="py-2">Centre</th>
                  <th className="py-2">Blood type</th>
                  <th className="py-2">Units</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((donation) => (
                  <tr key={donation.id} className="border-b">
                    <td className="py-2">{formatDateTime(donation.donated_at)}</td>
                    <td className="py-2">{centreNameFromJoin(donation.blood_centres)}</td>
                    <td className="py-2">{donation.blood_type}</td>
                    <td className="py-2">{donation.units}</td>
                    <td className="py-2 text-muted-foreground">{donation.notes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No donation records yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
