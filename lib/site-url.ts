const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

function normalizeSiteUrl(raw: string) {
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getPublicSiteUrl() {
  if (envSiteUrl) {
    return normalizeSiteUrl(envSiteUrl);
  }
  if (process.env.VERCEL_URL) {
    return normalizeSiteUrl(`https://${process.env.VERCEL_URL}`);
  }
  return "http://localhost:3000";
}

export function getBrowserAuthCallbackUrl() {
  const configured = getPublicSiteUrl();
  const browserOrigin =
    typeof window !== "undefined" ? window.location.origin : configured;
  const base =
    browserOrigin.includes("localhost") && !configured.includes("localhost")
      ? configured
      : browserOrigin;
  return `${base.replace(/\/+$/, "")}/auth/callback?next=/dashboard`;
}
