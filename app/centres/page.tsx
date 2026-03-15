import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DonationCentresPage() {
  const supabase = await createClient();
  const { data: centres } = await supabase
    .from("blood_centres")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Donation centres</h1>
          <p className="text-muted-foreground">Find participating blood donation centres across parishes.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {centres?.map((centre) => (
          <Card key={centre.id}>
            <CardHeader>
              <CardTitle>{centre.name}</CardTitle>
              <CardDescription>{centre.parish}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{centre.address}</p>
              <p className="text-muted-foreground">{centre.phone || "Phone not listed"}</p>
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
