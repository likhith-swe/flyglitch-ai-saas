/**
 * Affiliate click attribution. Booking URLs carry UTM parameters and the
 * /api/go/flight/[id] redirect endpoint records every outbound click.
 */

export function partnerFromUrl(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("skyscanner")) return "skyscanner";
  if (u.includes("kiwi.com")) return "kiwi";
  if (u.includes("cleartrip")) return "cleartrip";
  if (u.includes("makemytrip")) return "makemytrip";
  if (u.includes("google.com/travel")) return "google-flights";
  return "direct";
}

export function goPath(routeId: string): string {
  return `/api/go/flight/${routeId}`;
}

export function appendUtm(url: string, campaign: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "flyglitch");
    u.searchParams.set("utm_medium", "affiliate");
    u.searchParams.set("utm_campaign", campaign);
    return u.toString();
  } catch {
    return url;
  }
}
