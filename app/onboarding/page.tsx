import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireAuthProfile } from "@/lib/auth";

export default async function OnboardingFallbackPage() {
  await requireAuthProfile();

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Account setup in progress</CardTitle>
          <CardDescription>
            We could not determine your role yet. You can continue to your profile while setup completes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild>
            <Link href="/donor/profile">Continue setup</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Retry dashboard routing</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
