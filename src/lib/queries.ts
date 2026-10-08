import { eq, asc } from "drizzle-orm";
import { withDb, isDbAvailable } from "@/db";
import * as s from "@/db/schema";
import {
  FALLBACK_ROUTES,
  buildFlightPriceHistory,
  getFallbackRoute,
} from "./fallback-routes";
import { computeGlitchScore, classifyGlitch, discountPercentOf } from "./glitch-score";
import { newId } from "./auth/session";
import type {
  AlertEventRecord,
  FlightRoute,
  GlitchScoreParts,
  NotifyChannel,
  PricePoint,
  Profile,
  Watchlist,
} from "./types";

/**
 * Unified data-access layer. Every function degrades gracefully:
 *   PostgreSQL online  -> Drizzle queries against the live schema
 *   PostgreSQL offline -> verified 30-route catalog + global in-memory stores
 *
 * The in-memory stores live on `globalThis` so they survive hot reloads and
 * are shared across route handlers within a server process.
 */

const g = globalThis as typeof globalThis & {
  __fgMemProfiles?: Map<string, Profile>;
  __fgMemProfilesByEmail?: Map<string, string>;
  __fgMemWatchlists?: Map<string, Watchlist[]>;
  __fgMemNewsletter?: Map<string, { email: string; homeAirport: string | null; createdAt: string }>;
  __fgMemAlerts?: AlertEventRecord[];
  __fgMemState?: Map<string, unknown>;
  __fgMemClicks?: number;
  __fgSeeding?: Promise<number> | null;
};

const memProfiles: Map<string, Profile> = (g.__fgMemProfiles ??= new Map());
const memProfilesByEmail: Map<string, string> = (g.__fgMemProfilesByEmail ??= new Map());
const memWatchlists: Map<string, Watchlist[]> = (g.__fgMemWatchlists ??= new Map());
const memNewsletter: Map<string, { email: string; homeAirport: string | null; createdAt: string }> =
  (g.__fgMemNewsletter ??= new Map());
const memAlerts: AlertEventRecord[] = (g.__fgMemAlerts ??= []);
const memState: Map<string, unknown> = (g.__fgMemState ??= new Map());

/* ------------------------------------------------------------ conversion */

export function routeFromInputs(opts: {
  id: string;
  originCode: string;
  originCity: string;
  originCountry: string;
  originTerminal: string | null;
  destinationCode: string;
  destinationCity: string;
  destinationCountry: string;
  airlineName: string;
  airlineCode: string;
  flightNumber: string;
  cabinClass: string;
  stops: number;
  layoverCode: string | null;
  durationMinutes: number;
  nonstopDurationMinutes: number;
  currency: string;
  retailPriceMinor: number;
  currentPriceMinor: number;
  sixtyDayMedianMinor: number;
  lowestEverMinor: number;
  fuelSurchargeMinor: number;
  typicalFuelFeeMinor: number;
  observedHours: number;
  seatsRemaining: number;
  validUntilHours: number;
  bookingUrl: string;
  region: string;
  isSponsored?: boolean;
  sponsorCpmMinor?: number;
  lastCheckedAt?: Date | null;
}): FlightRoute {
  const layoverMinutes =
    opts.stops > 0 ? Math.max(0, opts.durationMinutes - opts.nonstopDurationMinutes) : null;
  const parts = computeGlitchScore({
    currentPriceMinor: opts.currentPriceMinor,
    sixtyDayMedianMinor: opts.sixtyDayMedianMinor,
    lowestEverMinor: opts.lowestEverMinor,
    seatsRemaining: opts.seatsRemaining,
    observedHours: opts.observedHours,
    stops: opts.stops,
    layoverMinutes,
    durationMinutes: opts.durationMinutes,
    nonstopDurationMinutes: opts.nonstopDurationMinutes,
    fuelSurchargeMinor: opts.fuelSurchargeMinor,
    typicalFuelFeeMinor: opts.typicalFuelFeeMinor,
  });
  const discountPercent = discountPercentOf(opts.retailPriceMinor, opts.currentPriceMinor);
  return {
    id: opts.id,
    origin: {
      code: opts.originCode,
      city: opts.originCity,
      country: opts.originCountry,
      terminal: opts.originTerminal,
    },
    destination: {
      code: opts.destinationCode,
      city: opts.destinationCity,
      country: opts.destinationCountry,
      terminal: null,
    },
    airline: opts.airlineName,
    airlineCode: opts.airlineCode,
    flightNumber: opts.flightNumber,
    cabinClass: (opts.cabinClass as FlightRoute["cabinClass"]) ?? "economy",
    stops: (opts.stops === 1 ? 1 : 0) as 0 | 1,
    layoverAirport: opts.layoverCode,
    layoverMinutes,
    durationMinutes: opts.durationMinutes,
    nonstopDurationMinutes: opts.nonstopDurationMinutes,
    originalRetailMinor: opts.retailPriceMinor,
    currentPriceMinor: opts.currentPriceMinor,
    sixtyDayMedianMinor: opts.sixtyDayMedianMinor,
    lowestEverMinor: opts.lowestEverMinor,
    currency: (opts.currency === "USD" ? "USD" : "INR") as FlightRoute["currency"],
    seatsRemaining: opts.seatsRemaining,
    fuelSurchargeMinor: opts.fuelSurchargeMinor,
    typicalFuelFeeMinor: opts.typicalFuelFeeMinor,
    isGlitch: classifyGlitch(parts.total, discountPercent),
    validUntilHours: opts.validUntilHours,
    observedHours: opts.observedHours,
    bookingUrl: opts.bookingUrl,
    region: (opts.region as FlightRoute["region"]) ?? "asia",
    isSponsored: opts.isSponsored ?? false,
    sponsorCpmMinor: opts.sponsorCpmMinor ?? 0,
    lastCheckedAt: opts.lastCheckedAt ? opts.lastCheckedAt.toISOString() : new Date().toISOString(),
    glitchScore: parts.total,
    glitchScoreParts: parts,
    discountPercent,
  };
}

export function rowToRoute(row: s.RouteRow): FlightRoute {
  return routeFromInputs({
    id: row.id,
    originCode: row.originCode,
    originCity: row.originCity,
    originCountry: row.originCountry,
    originTerminal: row.originTerminal,
    destinationCode: row.destinationCode,
    destinationCity: row.destinationCity,
    destinationCountry: row.destinationCountry,
    airlineName: row.airlineName,
    airlineCode: row.airlineCode,
    flightNumber: row.flightNumber,
    cabinClass: row.cabinClass,
    stops: row.stops,
    layoverCode: row.layoverCode,
    durationMinutes: row.durationMinutes,
    nonstopDurationMinutes: row.nonstopDurationMinutes,
    currency: row.currency,
    retailPriceMinor: row.retailPriceMinor,
    currentPriceMinor: row.currentPriceMinor,
    sixtyDayMedianMinor: row.sixtyDayMedianMinor,
    lowestEverMinor: row.lowestEverMinor,
    fuelSurchargeMinor: row.fuelSurchargeMinor,
    typicalFuelFeeMinor: row.typicalFuelFeeMinor,
    observedHours: row.observedHours,
    seatsRemaining: row.seatsRemaining,
    validUntilHours: row.validUntilHours,
    bookingUrl: row.bookingUrl,
    region: row.region,
    isSponsored: row.isSponsored,
    sponsorCpmMinor: row.sponsorCpmMinor,
    lastCheckedAt: row.lastCheckedAt,
  });
}

function flattenParts(p: GlitchScoreParts): Record<string, number> {
  return {
    deviation: p.deviation,
    velocity: p.velocity,
    convenience: p.convenience,
    fuel: p.fuel,
    floorBonus: p.floorBonus,
    layoverPenalty: p.layoverPenalty,
    rawDeviation: p.raw.deviation,
    rawVelocity: p.raw.velocity,
    rawConvenience: p.raw.convenience,
    rawFuel: p.raw.fuel,
    total: p.total,
  };
}

/* --------------------------------------------------------------- seeding */

/** Idempotently upsert the verified 30-route catalog into PostgreSQL. */
export async function seedCatalog(): Promise<number> {
  const available = await isDbAvailable();
  if (!available) return 0;
  if (!g.__fgSeeding) {
    g.__fgSeeding = withDb(
      async (db) => {
        let inserted = 0;
        for (const r of FALLBACK_ROUTES) {
          await db
            .insert(s.routes)
            .values({
              id: r.id,
              originCode: r.origin.code,
              originCity: r.origin.city,
              originCountry: r.origin.country,
              originTerminal: r.origin.terminal ?? null,
              destinationCode: r.destination.code,
              destinationCity: r.destination.city,
              destinationCountry: r.destination.country,
              airlineName: r.airline,
              airlineCode: r.airlineCode,
              flightNumber: r.flightNumber,
              cabinClass: r.cabinClass,
              stops: r.stops,
              layoverCode: r.layoverAirport,
              durationMinutes: r.durationMinutes,
              nonstopDurationMinutes: r.nonstopDurationMinutes,
              currency: r.currency,
              retailPriceMinor: r.originalRetailMinor,
              currentPriceMinor: r.currentPriceMinor,
              sixtyDayMedianMinor: r.sixtyDayMedianMinor,
              lowestEverMinor: r.lowestEverMinor,
              fuelSurchargeMinor: r.fuelSurchargeMinor,
              typicalFuelFeeMinor: r.typicalFuelFeeMinor,
              observedHours: r.observedHours,
              discountPercent: r.discountPercent,
              glitchScore: r.glitchScore,
              glitchScoreParts: flattenParts(r.glitchScoreParts),
              seatsRemaining: r.seatsRemaining,
              validUntilHours: r.validUntilHours,
              isGlitch: r.isGlitch,
              isSponsored: false,
              sponsorCpmMinor: 0,
              region: r.region,
              bookingUrl: r.bookingUrl,
              lastCheckedAt: new Date(),
            })
            .onConflictDoNothing({ target: s.routes.id });
          inserted += 1;
        }
        return inserted;
      },
      0,
      8_000
    ).finally(() => {
      g.__fgSeeding = null;
    });
  }
  return g.__fgSeeding;
}

/* ---------------------------------------------------------------- routes */

export async function listAllRoutes(): Promise<{ routes: FlightRoute[]; source: "database" | "fallback" }> {
  const dbRoutes = await withDb(
    async (db) => {
      const rows = await db.select().from(s.routes);
      return rows;
    },
    [] as s.RouteRow[],
    4_000
  );

  if (dbRoutes.length > 0) {
    return { routes: dbRoutes.map(rowToRoute), source: "database" };
  }

  // Empty table while DB is reachable -> lazily seed the verified catalog.
  if (await isDbAvailable()) {
    await seedCatalog();
    const reseeded = await withDb(
      async (db) => db.select().from(s.routes),
      [] as s.RouteRow[],
      4_000
    );
    if (reseeded.length > 0) return { routes: reseeded.map(rowToRoute), source: "database" };
  }

  return { routes: FALLBACK_ROUTES, source: "fallback" };
}

export async function getRouteById(id: string): Promise<FlightRoute | null> {
  const row = await withDb(
    async (db) => {
      const rows = await db.select().from(s.routes).where(eq(s.routes.id, id)).limit(1);
      return rows[0] ?? null;
    },
    null,
    3_000
  );
  if (row) return rowToRoute(row);
  return getFallbackRoute(id) ?? null;
}

export async function getRoutesForPair(origin: string, destination: string): Promise<FlightRoute[]> {
  const { routes } = await listAllRoutes();
  const o = origin.toUpperCase();
  const d = destination.toUpperCase();
  return routes.filter((r) => r.origin.code === o && r.destination.code === d);
}

export async function getRoutesByRegion(region: string): Promise<FlightRoute[]> {
  const { routes } = await listAllRoutes();
  return routes.filter((r) => r.region === region);
}

/* ---------------------------------------------------------- price history */

export async function getPriceHistory(route: FlightRoute): Promise<{ points: PricePoint[]; source: string }> {
  const dbPoints = await withDb(
    async (db) => {
      const rows = await db
        .select()
        .from(s.priceHistory)
        .where(eq(s.priceHistory.routeId, route.id))
        .orderBy(asc(s.priceHistory.recordedAt))
        .limit(400);
      return rows.map((r) => ({
        date: r.recordedAt.toISOString(),
        priceMinor: r.priceMinor,
        source: r.source as PricePoint["source"],
      }));
    },
    [] as PricePoint[],
    3_000
  );
  if (dbPoints.length >= 30) return { points: dbPoints, source: "database" };
  return { points: buildFlightPriceHistory(route), source: "model" };
}

export async function appendPriceSample(
  routeId: string,
  priceMinor: number,
  source = "cron"
): Promise<boolean> {
  return withDb(
    async (db) => {
      await db.insert(s.priceHistory).values({
        id: newId("ph"),
        routeId,
        priceMinor,
        source,
        recordedAt: new Date(),
      });
      return true;
    },
    false,
    3_000
  );
}

/* -------------------------------------------------------- affiliate clicks */

export async function recordAffiliateClick(input: {
  routeId: string;
  originCode: string;
  destinationCode: string;
  airline: string;
  partner: string;
  targetUrl: string;
  ipHash: string | null;
  utmCampaign: string | null;
  userId: string | null;
}): Promise<string> {
  const id = newId("clk");
  await withDb(
    async (db) => {
      await db.insert(s.affiliateClicks).values({
        id,
        userId: input.userId,
        routeId: input.routeId,
        originCode: input.originCode,
        destinationCode: input.destinationCode,
        airline: input.airline,
        partner: input.partner,
        targetUrl: input.targetUrl,
        ipHash: input.ipHash,
        utmCampaign: input.utmCampaign,
        clickedAt: new Date(),
      });
      return true;
    },
    false,
    2_500
  );
  g.__fgMemClicks = (g.__fgMemClicks ?? 0) + 1;
  return id;
}

export function offlineClickCount(): number {
  return g.__fgMemClicks ?? 0;
}

/* -------------------------------------------------------------- newsletter */

export async function subscribeNewsletter(
  email: string,
  homeAirport: string | null
): Promise<{ ok: boolean; alreadySubscribed: boolean }> {
  const normalized = email.toLowerCase().trim();
  const existing = await withDb(
    async (db) => {
      const rows = await db
        .select()
        .from(s.newsletterSubscribers)
        .where(eq(s.newsletterSubscribers.email, normalized))
        .limit(1);
      return rows[0] ?? null;
    },
    null,
    3_000
  );
  if (existing) return { ok: true, alreadySubscribed: true };
  if (memNewsletter.has(normalized)) return { ok: true, alreadySubscribed: true };

  const inserted = await withDb(
    async (db) => {
      await db.insert(s.newsletterSubscribers).values({
        id: newId("nl"),
        email: normalized,
        homeAirport,
        status: "subscribed",
        createdAt: new Date(),
      });
      return true;
    },
    false,
    3_000
  );
  if (!inserted) {
    memNewsletter.set(normalized, {
      email: normalized,
      homeAirport,
      createdAt: new Date().toISOString(),
    });
  }
  return { ok: true, alreadySubscribed: false };
}

/* ---------------------------------------------------------------- profiles */

function makeMemoryProfile(email: string, provider: string): Profile {
  const id = newId("usr");
  const profile: Profile = {
    id,
    email,
    fullName: null,
    avatarUrl: null,
    isPro: false,
    planTier: "free",
    telegramChatId: null,
    whatsappPhone: null,
    customRoutesCount: 0,
    authProvider: provider,
    createdAt: new Date().toISOString(),
  };
  memProfiles.set(id, profile);
  memProfilesByEmail.set(email.toLowerCase(), id);
  return profile;
}

function profileFromRow(row: s.ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    avatarUrl: row.avatarUrl,
    isPro: row.isPro,
    planTier: (row.planTier as Profile["planTier"]) ?? "free",
    telegramChatId: row.telegramChatId,
    whatsappPhone: row.whatsappPhone,
    customRoutesCount: row.customRoutesCount,
    authProvider: row.authProvider,
    createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
  };
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const row = await withDb(
    async (db) => {
      const rows = await db.select().from(s.profiles).where(eq(s.profiles.id, id)).limit(1);
      return rows[0] ?? null;
    },
    null,
    3_000
  );
  if (row) return profileFromRow(row);
  return memProfiles.get(id) ?? null;
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const normalized = email.toLowerCase().trim();
  const row = await withDb(
    async (db) => {
      const rows = await db.select().from(s.profiles).where(eq(s.profiles.email, normalized)).limit(1);
      return rows[0] ?? null;
    },
    null,
    3_000
  );
  if (row) return profileFromRow(row);
  const memId = memProfilesByEmail.get(normalized);
  return memId ? memProfiles.get(memId) ?? null : null;
}

/** Find-or-create a profile for a verified magic-link email. */
export async function upsertProfileByEmail(
  email: string,
  provider = "magic-link"
): Promise<Profile> {
  const normalized = email.toLowerCase().trim();
  const existing = await getProfileByEmail(normalized);
  if (existing) return existing;

  const id = newId("usr");
  const inserted = await withDb(
    async (db) => {
      await db.insert(s.profiles).values({
        id,
        email: normalized,
        isPro: false,
        planTier: "free",
        customRoutesCount: 0,
        authProvider: provider,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return true;
    },
    false,
    3_000
  );

  if (inserted) {
    const created = await getProfileById(id);
    if (created) return created;
  }
  return makeMemoryProfile(normalized, provider);
}

export async function upgradeProfileToPro(
  profileId: string,
  opts: {
    provider: "razorpay" | "stripe" | "sandbox";
    subscriptionId?: string | null;
    amountMinor: number;
    currency: "INR" | "USD";
    periodEnd?: Date;
  }
): Promise<boolean> {
  const memProfile = memProfiles.get(profileId);
  if (memProfile) {
    memProfiles.set(profileId, { ...memProfile, isPro: true, planTier: "club_pro" });
  }

  const upgraded = await withDb(
    async (db) => {
      await db
        .update(s.profiles)
        .set({ isPro: true, planTier: "club_pro", updatedAt: new Date() })
        .where(eq(s.profiles.id, profileId));
      await db.insert(s.subscriptions).values({
        id: newId("sub"),
        userId: profileId,
        provider: opts.provider,
        subscriptionId: opts.subscriptionId ?? null,
        status: "active",
        amountMinor: opts.amountMinor,
        currency: opts.currency,
        currentPeriodEnd: opts.periodEnd ?? null,
        rawEvents: [],
        createdAt: new Date(),
      });
      return true;
    },
    false,
    4_000
  );
  return upgraded || memProfile !== undefined;
}

export async function downgradeProfile(profileId: string): Promise<boolean> {
  const memProfile = memProfiles.get(profileId);
  if (memProfile) {
    memProfiles.set(profileId, { ...memProfile, isPro: false, planTier: "free" });
  }
  return withDb(
    async (db) => {
      await db
        .update(s.profiles)
        .set({ isPro: false, planTier: "free", updatedAt: new Date() })
        .where(eq(s.profiles.id, profileId));
      return true;
    },
    false,
    3_000
  );
}

/* -------------------------------------------------------------- watchlists */

export async function listWatchlists(userId: string): Promise<Watchlist[]> {
  const rows = await withDb(
    async (db) => db.select().from(s.userWatchlists).where(eq(s.userWatchlists.userId, userId)),
    [] as s.WatchlistRow[],
    3_000
  );
  if (rows.length > 0) return rows.map(watchlistFromRow);
  return memWatchlists.get(userId) ?? [];
}

export function watchlistFromRow(row: s.WatchlistRow): Watchlist {
  return {
    id: row.id,
    userId: row.userId,
    originCode: row.originCode,
    destinationCode: row.destinationCode,
    maxPriceMinor: row.maxPriceMinor,
    minDiscountPercent: row.minDiscountPercent,
    notifyChannel: row.notifyChannel as NotifyChannel,
    destinationAddress: row.destinationAddress,
    isActive: row.isActive,
    lastNotifiedAt: row.lastNotifiedAt ? row.lastNotifiedAt.toISOString() : null,
    createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
  };
}

export async function createWatchlist(input: {
  userId: string;
  originCode: string;
  destinationCode: string | null;
  maxPriceMinor: number | null;
  minDiscountPercent: number | null;
  notifyChannel: NotifyChannel;
  destinationAddress: string | null;
}): Promise<Watchlist> {
  const id = newId("wl");
  const watchlist: Watchlist = {
    id,
    userId: input.userId,
    originCode: input.originCode.toUpperCase(),
    destinationCode: input.destinationCode ? input.destinationCode.toUpperCase() : null,
    maxPriceMinor: input.maxPriceMinor,
    minDiscountPercent: input.minDiscountPercent,
    notifyChannel: input.notifyChannel,
    destinationAddress: input.destinationAddress,
    isActive: true,
    lastNotifiedAt: null,
    createdAt: new Date().toISOString(),
  };

  const inserted = await withDb(
    async (db) => {
      await db.insert(s.userWatchlists).values({
        id,
        userId: input.userId,
        originCode: watchlist.originCode,
        destinationCode: watchlist.destinationCode,
        maxPriceMinor: watchlist.maxPriceMinor,
        minDiscountPercent: watchlist.minDiscountPercent,
        notifyChannel: watchlist.notifyChannel,
        destinationAddress: watchlist.destinationAddress,
        isActive: true,
        createdAt: new Date(),
      });
      return true;
    },
    false,
    3_000
  );

  if (!inserted) {
    const list = memWatchlists.get(input.userId) ?? [];
    list.unshift(watchlist);
    memWatchlists.set(input.userId, list);
  }
  return watchlist;
}

export async function deleteWatchlist(userId: string, id: string): Promise<boolean> {
  const memList = memWatchlists.get(userId);
  if (memList) memWatchlists.set(userId, memList.filter((w) => w.id !== id));
  return withDb(
    async (db) => {
      await db.delete(s.userWatchlists).where(eq(s.userWatchlists.id, id));
      return true;
    },
    false,
    3_000
  );
}

/** All active watchlists across users — used by the cron dispatch pipeline. */
export async function allActiveWatchlists(): Promise<Array<{ watchlist: Watchlist; profile: Profile | null }>> {
  const dbRows = await withDb(
    async (db) => db.select().from(s.userWatchlists),
    [] as s.WatchlistRow[],
    3_000
  );
  const out: Array<{ watchlist: Watchlist; profile: Profile | null }> = [];
  for (const row of dbRows) {
    if (!row.isActive) continue;
    const profile = await getProfileById(row.userId);
    out.push({ watchlist: watchlistFromRow(row), profile });
  }
  for (const [userId, list] of memWatchlists) {
    const profile = await getProfileById(userId);
    for (const w of list) if (w.isActive) out.push({ watchlist: w, profile });
  }
  return out;
}

export async function markWatchlistNotified(watchlistId: string): Promise<void> {
  for (const [, list] of memWatchlists) {
    const hit = list.find((w) => w.id === watchlistId);
    if (hit) hit.lastNotifiedAt = new Date().toISOString();
  }
  await withDb(
    async (db) => {
      await db
        .update(s.userWatchlists)
        .set({ lastNotifiedAt: new Date() })
        .where(eq(s.userWatchlists.id, watchlistId));
      return true;
    },
    false,
    2_500
  );
}

/* ------------------------------------------------------------ alert events */

export async function recordAlertEvent(evt: AlertEventRecord): Promise<void> {
  memAlerts.unshift(evt);
  if (memAlerts.length > 500) memAlerts.length = 500;
  await withDb(
    async (db) => {
      await db.insert(s.alertEvents).values({
        id: evt.id,
        watchlistId: evt.watchlistId,
        routeId: evt.routeId,
        channel: evt.channel,
        status: evt.status,
        latencyMs: evt.latencyMs,
        payload: evt.payload,
        createdAt: new Date(),
      });
      return true;
    },
    false,
    2_500
  );
}

/* ------------------------------------------------------------- system state */

export async function getSystemState<T>(key: string): Promise<T | null> {
  const dbValue = await withDb(
    async (db) => {
      const rows = await db.select().from(s.systemState).where(eq(s.systemState.stateKey, key)).limit(1);
      return rows[0]?.value ?? null;
    },
    null,
    2_500
  );
  if (dbValue !== null) return dbValue as T;
  return (memState.get(key) as T | undefined) ?? null;
}

export async function setSystemState(key: string, value: unknown): Promise<void> {
  memState.set(key, value);
  await withDb(
    async (db) => {
      await db
        .insert(s.systemState)
        .values({ stateKey: key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: s.systemState.stateKey, set: { value, updatedAt: new Date() } });
      return true;
    },
    false,
    2_500
  );
}
