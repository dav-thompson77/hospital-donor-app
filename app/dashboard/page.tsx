import { redirect } from "next/navigation";
import { getRoleHomePath, requireAuthProfile } from "@/lib/auth";

export default async function DashboardRedirectPage() {
  const { profile } = await requireAuthProfile();
  redirect(getRoleHomePath(profile.role));
}
