import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Phone } from "lucide-react";

export default async function DonationCentresPage() {
  const supabase = await createClient();
  const { data: centres } = await supabase
    .from("blood_centers")
    .select("*")
    .eq("is_active", true)
    .order("name");

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
        {centres?.map((centre) => (
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
              <p>{centre.address}</p>
              <p className="inline-flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {centre.phone || "Phone not listed"}
              </p>
              {centre.latitude && centre.longitude ? (
                <p className="text-xs text-muted-foreground">
                  Coordinates: {centre.latitude}, {centre.longitude}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
