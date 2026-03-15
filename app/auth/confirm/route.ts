import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const callbackUrl = `/auth/callback?${url.searchParams.toString()}`;
  redirect(callbackUrl);
}
