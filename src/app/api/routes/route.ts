import { listAllRoutes } from "@/lib/queries";
import type { FlightRoute } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Live glitch radar feed with filtering + sorting.
 * Query params: origin, destination, region, currency, maxPrice (major units),
 * nonstop=true, minDiscount=55, sort=score|discount|price|seats, limit.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = url.searchParams;

  const { routes, source } = await listAllRoutes();
  let out: FlightRoute[] = [...routes];

  const origin = p.get("origin")?.toUpperCase();
  const destination = p.get("destination")?.toUpperCase();
  const region = p.get("region");
  const currency = p.get("currency")?.toUpperCase();
  const maxPrice = Number(p.get("maxPrice"));
  const nonstop = p.get("nonstop") === "true" || p.get("nonstop") === "1";
  const minDiscount = Number(p.get("minDiscount"));

  if (origin && origin !== "ANY") out = out.filter((r) => r.origin.code === origin);
  if (destination && destination !== "ANY") out = out.filter((r) => r.destination.code === destination);
  if (region) out = out.filter((r) => r.region === region);
  if (currency === "INR" || currency === "USD") out = out.filter((r) => r.currency === currency);
  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    out = out.filter((r) => r.currentPriceMinor / 100 <= maxPrice);
  }
  if (nonstop) out = out.filter((r) => r.stops === 0);
  if (Number.isFinite(minDiscount) && minDiscount > 0) {
    out = out.filter((r) => r.discountPercent >= minDiscount);
  }

  const sort = p.get("sort") ?? "score";
  out.sort((a, b) => {
    switch (sort) {
      case "discount":
        return b.discountPercent - a.discountPercent;
      case "price":
        return a.currentPriceMinor / (a.currency === "INR" ? 83 : 1) -
          b.currentPriceMinor / (b.currency === "INR" ? 83 : 1);
      case "seats":
        return a.seatsRemaining - b.seatsRemaining;
      default:
        return b.glitchScore - a.glitchScore;
    }
  });

  const limit = Number(p.get("limit"));
  if (Number.isFinite(limit) && limit > 0) out = out.slice(0, Math.floor(limit));

  return Response.json({
    ok: true,
    source,
    count: out.length,
    total: routes.length,
    generatedAt: new Date().toISOString(),
    routes: out,
  });
}
