import { eq } from "drizzle-orm";
import { withDb } from "@/db";
import * as s from "@/db/schema";
import { env } from "@/lib/env";
import {
  allActiveWatchlists,
  appendPriceSample,
  listAllRoutes,
  markWatchlistNotified,
  recordAlertEvent,
  setSystemState,
} from "@/lib/queries";
import { dispatchAlert } from "@/lib/notify";
import { fetchLiveQuote, rapidApiAvailable } from "@/lib/rapidapi";
import { computeGlitchScore, classifyGlitch, discountPercentOf } from "@/lib/glitch-score";
import { newId } from "@/lib/auth/session";
import type { CronAuditReport, FlightRoute } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel-Cron-compatible refresh + dispatch pipeline.
 * 1. Authorizes via CRON_SECRET (open mode when unset).
 * 2. Calls RapidAPI when provisioned, otherwise simulates a market tick.
 * 3. Re-computes Glitch Scores and appends price-history samples.
 * 4. Matches active watchlists and dispatches Telegram / WhatsApp / email.
 * 5. Returns a full execution audit report.
 */

function authorized(req: Request): boolean {
  if (!env.CRON_SECRET) return true; // open mode for local / unprovisioned ops
  const bearer = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  return bearer === `Bearer ${env.CRON_SECRET}` || headerSecret === env.CRON_SECRET;
}

async function run(): Promise<Response> {
  const startedAt = Date.now();
  const report: CronAuditReport = {
    startedAt: new Date(startedAt).toISOString(),
    source: "fallback",
    provider: rapidApiAvailable() ? "rapidapi-live" : "simulation",
    routesScanned: 0,
    routesRefreshed: 0,
    samplesAppended: 0,
    watchlistsEvaluated: 0,
    matches: [],
    alertsDispatched: 0,
    durationMs: 0,
  };

  const { routes, source } = await listAllRoutes();
  report.source = source;
  report.routesScanned = routes.length;

  // ---- 1+2. Live enrichment (first routes) or simulated market tick ------
  const refreshedPrices = new Map<string, { priceMinor: number; provider: string }>();
  let liveHits = 0;
  for (const route of routes.slice(0, 3)) {
    const quote = await fetchLiveQuote(route);
    if (quote) {
      refreshedPrices.set(route.id, { priceMinor: quote.currentPriceMinor, provider: "rapidapi" });
      liveHits += 1;
    }
  }
  if (rapidApiAvailable() && liveHits === 0) report.provider = "rapidapi-unavailable";

  for (const route of routes) {
    if (!refreshedPrices.has(route.id)) {
      // Simulated tick: glitches drift toward the floor, never below it.
      const drift = 1 - Math.random() * 0.012;
      const floor = Math.round(route.lowestEverMinor * 0.97);
      const next = Math.max(floor, Math.round(route.currentPriceMinor * drift));
      refreshedPrices.set(route.id, { priceMinor: next, provider: "simulation" });
    }
  }

  // ---- 3. Re-score + persist samples --------------------------------------
  const rescored = new Map<string, FlightRoute>();
  for (const route of routes) {
    const { priceMinor } = refreshedPrices.get(route.id) ?? {
      priceMinor: route.currentPriceMinor,
    };
    const parts = computeGlitchScore({
      currentPriceMinor: priceMinor,
      sixtyDayMedianMinor: route.sixtyDayMedianMinor,
      lowestEverMinor: route.lowestEverMinor,
      seatsRemaining: route.seatsRemaining,
      observedHours: route.observedHours,
      stops: route.stops,
      layoverMinutes: route.layoverMinutes,
      durationMinutes: route.durationMinutes,
      nonstopDurationMinutes: route.nonstopDurationMinutes,
      fuelSurchargeMinor: route.fuelSurchargeMinor,
      typicalFuelFeeMinor: route.typicalFuelFeeMinor,
    });
    const discount = discountPercentOf(route.originalRetailMinor, priceMinor);
    rescored.set(route.id, {
      ...route,
      currentPriceMinor: priceMinor,
      glitchScore: parts.total,
      glitchScoreParts: parts,
      discountPercent: discount,
      isGlitch: classifyGlitch(parts.total, discount),
      lastCheckedAt: new Date().toISOString(),
    });

    const appended = await appendPriceSample(route.id, priceMinor, report.provider);
    if (appended) report.samplesAppended += 1;
    report.routesRefreshed += 1;
  }

  await withDb(
    async (db) => {
      for (const route of rescored.values()) {
        await db
          .update(s.routes)
          .set({
            currentPriceMinor: route.currentPriceMinor,
            discountPercent: route.discountPercent,
            glitchScore: route.glitchScore,
            isGlitch: route.isGlitch,
            lastCheckedAt: new Date(),
          })
          .where(eq(s.routes.id, route.id));
      }
      return true;
    },
    false,
    8_000
  );

  // ---- 4. Watchlist matching + dispatch -----------------------------------
  const watchlists = await allActiveWatchlists();
  report.watchlistsEvaluated = watchlists.length;
  const routeList = [...rescored.values()];

  for (const { watchlist, profile } of watchlists) {
    const candidates = routeList.filter((r) => {
      const originOk = watchlist.originCode === "ANY" || r.origin.code === watchlist.originCode;
      const destOk = !watchlist.destinationCode || r.destination.code === watchlist.destinationCode;
      const priceOk = watchlist.maxPriceMinor !== null && r.currentPriceMinor <= watchlist.maxPriceMinor;
      const discountOk =
        watchlist.minDiscountPercent !== null && r.discountPercent >= watchlist.minDiscountPercent;
      return originOk && destOk && (priceOk || discountOk);
    });
    if (candidates.length === 0) continue;

    // De-dupe storm protection: skip if notified within the last 30 minutes.
    if (watchlist.lastNotifiedAt) {
      const elapsed = Date.now() - new Date(watchlist.lastNotifiedAt).getTime();
      if (elapsed < 30 * 60 * 1000) continue;
    }

    const best = candidates.sort((a, b) => b.glitchScore - a.glitchScore)[0];
    const reason =
      (watchlist.maxPriceMinor !== null && best.currentPriceMinor <= watchlist.maxPriceMinor
        ? `price ${best.currentPriceMinor / 100} <= target ${watchlist.maxPriceMinor / 100}`
        : `discount ${Math.round(best.discountPercent)}% >= ${watchlist.minDiscountPercent ?? 0}%`) +
      ` on ${best.origin.code}-${best.destination.code}`;

    const dispatch = await dispatchAlert({
      channel: watchlist.notifyChannel,
      route: best,
      watchlist,
      profile,
    });

    await recordAlertEvent({
      id: newId("alrt"),
      watchlistId: watchlist.id,
      routeId: best.id,
      channel: watchlist.notifyChannel,
      status: dispatch.status,
      latencyMs: dispatch.latencyMs,
      payload: { reason, detail: dispatch.detail },
      createdAt: new Date().toISOString(),
    });
    await markWatchlistNotified(watchlist.id);

    report.matches.push({
      watchlistId: watchlist.id,
      routeId: best.id,
      reason,
      channel: watchlist.notifyChannel,
      status: dispatch.status,
      latencyMs: dispatch.latencyMs,
    });
    report.alertsDispatched += 1;
  }

  report.finishedAt = new Date().toISOString();
  report.durationMs = Date.now() - startedAt;
  await setSystemState("last_cron_report", report);

  return Response.json({ ok: true, report });
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return run();
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return run();
}
