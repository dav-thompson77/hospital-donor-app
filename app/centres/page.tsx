import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock3, MapPinned, Phone } from "lucide-react";

type DisplayCentre = {
  id: number | string;
  name: string;
  parish: string;
  address: string;
  phone: string;
  hours: string;
  support: string;
};

const fallbackCentres: DisplayCentre[] = [
  {
    id: "f-1",
    name: "National Blood Transfusion Service",
    parish: "Kingston",
    address: "21 Slipe Pen Road, Kingston",
    phone: "+1-876-555-3001",
    hours: "Mon-Fri, 8:00 AM - 4:00 PM",
    support: "Walk-ins accepted; appointments encouraged for faster processing.",
  },
  {
    id: "f-2",
    name: "National Chest Hospital / Kiwanis Blood Collection Centre",
    parish: "Kingston",
    address: "36 Barbican Road, Kingston 6",
    phone: "+1-876-555-3005",
    hours: "Tue-Sat, 9:00 AM - 5:00 PM",
    support: "Scheduled collections supported for repeat and first-time donors.",
  },
  {
    id: "f-3",
    name: "St. Ann's Bay Hospital",
    parish: "St. Ann",
    address: "15 St. Ann's Bay Main Road, St. Ann's Bay",
    phone: "+1-876-555-3002",
    hours: "Mon-Fri, 8:30 AM - 3:30 PM",
    support: "Hospital-linked collection with priority booking for urgent drives.",
  },
  {
    id: "f-4",
    name: "Savanna-la-Mar Hospital",
    parish: "Westmoreland",
    address: "6 Beckford Street, Savanna-la-Mar",
    phone: "+1-876-555-3003",
    hours: "Mon-Fri, 8:00 AM - 3:00 PM",
    support: "Community blood drive collections available during campaign periods.",
  },
  {
    id: "f-5",
    name: "Port Antonio Hospital",
    parish: "Portland",
    address: "West Street, Port Antonio",
    phone: "+1-876-555-3004",
    hours: "Mon-Fri, 8:00 AM - 4:00 PM",
    support: "Appointment recommended for screening and donation readiness checks.",
  },
];

const centreStyleByName: Record<string, Pick<DisplayCentre, "hours" | "support">> = {
  "National Blood Transfusion Service": {
    hours: "Mon-Fri, 8:00 AM - 4:00 PM",
    support: "Walk-ins accepted; appointments encouraged for faster processing.",
  },
  "National Chest Hospital / Kiwanis Blood Collection Centre": {
    hours: "Tue-Sat, 9:00 AM - 5:00 PM",
    support: "Scheduled collections supported for repeat and first-time donors.",
  },
  "St. Ann's Bay Hospital": {
    hours: "Mon-Fri, 8:30 AM - 3:30 PM",
    support: "Hospital-linked collection with priority booking for urgent drives.",
  },
  "Savanna-la-Mar Hospital": {
    hours: "Mon-Fri, 8:00 AM - 3:00 PM",
    support: "Community blood drive collections available during campaign periods.",
  },
  "Port Antonio Hospital": {
    hours: "Mon-Fri, 8:00 AM - 4:00 PM",
    support: "Appointment recommended for screening and donation readiness checks.",
  },
};

export default async function DonationCentresPage() {
  const supabase = await createClient();
  const { data: centres } = await supabase
    .from("blood_centers")
    .select("*")
    .eq("is_active", true)
    .order("name");

  const centresForDisplay: DisplayCentre[] = centres?.length
    ? centres.map((centre) => {
        const metadata = centreStyleByName[centre.name] ?? {
          hours: "Mon-Fri, 8:00 AM - 4:00 PM",
          support: "Appointments encouraged before arrival.",
        };
        return {
          id: centre.id,
          name: centre.name,
          parish: centre.parish,
          address: centre.address,
          phone: centre.phone || "Phone not listed",
          hours: metadata.hours,
          support: metadata.support,
        };
      })
    : fallbackCentres;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Donation centres</h1>
          <p className="text-muted-foreground">
            Find participating blood donation centres across Jamaica.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {centresForDisplay.map((centre) => (
          <Card key={centre.id} className="border-primary/15">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {centre.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary/25 text-primary">
                  {centre.parish}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="inline-flex items-start gap-1">
                <MapPinned className="mt-0.5 h-3.5 w-3.5 text-primary" />
                <span>{centre.address}</span>
              </p>
              <p className="inline-flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {centre.phone}
              </p>
              <p className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {centre.hours}
              </p>
              <p className="rounded-md bg-accent/40 p-2 text-xs text-muted-foreground">
                {centre.support}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm">
                  <Link href={`/donor/appointments?center_id=${centre.id}`}>
                    Book appointment
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${centre.name}, ${centre.address}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View centre details
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
