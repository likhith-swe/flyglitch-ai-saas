import { getRouteById, getPriceHistory } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** 60-day price curve + derived statistics for a route. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const route = await getRouteById(id);
  if (!route) {
    return Response.json({ ok: false, error: "route_not_found" }, { status: 404 });
  }

  const { points, source } = await getPriceHistory(route);
  const prices = points.map((pt) => pt.priceMinor);
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? route.currentPriceMinor;
  const peak = sorted[sorted.length - 1] ?? route.currentPriceMinor;

  return Response.json({
    ok: true,
    routeId: route.id,
    pair: `${route.origin.code}-${route.destination.code}`,
    source,
    points,
    stats: {
      currentMinor: route.currentPriceMinor,
      medianMinor: median,
      peakMinor: peak,
      lowestEverMinor: route.lowestEverMinor,
      dropFromMedianPct:
        median > 0 ? Math.round(((median - route.currentPriceMinor) / median) * 100) : 0,
      glitchScore: route.glitchScore,
      isGlitch: route.isGlitch,
    },
  });
}
