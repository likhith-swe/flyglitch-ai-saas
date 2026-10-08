import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRouteById, recordAffiliateClick } from "@/lib/queries";
import { partnerFromUrl } from "@/lib/affiliate";
import { hashIp, verifySessionCookie, sessionCookieName } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Affiliate claim endpoint — records an anonymised outbound click then
 * 307-redirects to the deep-linked booking search.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const route = await getRouteById(id);
  if (!route) {
    return NextResponse.redirect(new URL("/", req.url), 307);
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  let userId: string | null = null;
  try {
    const store = await cookies();
    userId = verifySessionCookie(store.get(sessionCookieName())?.value);
  } catch {
    userId = null;
  }

  await recordAffiliateClick({
    routeId: route.id,
    originCode: route.origin.code,
    destinationCode: route.destination.code,
    airline: route.airline,
    partner: partnerFromUrl(route.bookingUrl),
    targetUrl: route.bookingUrl,
    ipHash: hashIp(ip),
    utmCampaign: `glitch-radar-${route.id}`,
    userId,
  });

  return NextResponse.redirect(route.bookingUrl, 307);
}
