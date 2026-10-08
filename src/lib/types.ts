export type CabinClass = "economy" | "premium_economy" | "business";
export type Currency = "INR" | "USD";
export type Region = "asia" | "europe" | "middle-east" | "domestic-india" | "americas";
export type NotifyChannel = "telegram" | "whatsapp" | "email";
export type PlanTier = "free" | "club_pro";

export interface AirportRef {
  code: string;
  city: string;
  country: string;
  terminal?: string | null;
}

export interface GlitchScoreParts {
  /** S_deviation — weighted contribution of discount vs 60-day median (0..45). */
  deviation: number;
  /** S_velocity — weighted contribution of inventory drain speed (0..25). */
  velocity: number;
  /** S_convenience — weighted routing convenience (0..15). */
  convenience: number;
  /** S_fuel — weighted fuel-dump / YQ-YR anomaly signal (0..15). */
  fuel: number;
  /** B_floor — +15 when price <= all-time low. */
  floorBonus: number;
  /** P_layover — -20 when travel time > 2.5x nonstop duration. */
  layoverPenalty: number;
  /** Raw component scores before weighting, for UI inspection. */
  raw: {
    deviation: number;
    velocity: number;
    convenience: number;
    fuel: number;
  };
  /** Final normalized 0..100 score. */
  total: number;
}

export interface GlitchScoreInput {
  currentPriceMinor: number;
  sixtyDayMedianMinor: number;
  lowestEverMinor: number;
  seatsRemaining: number;
  /** Hours the inventory drain has been observed for. */
  observedHours: number;
  stops: number;
  /** Layover minutes (only when stops >= 1). */
  layoverMinutes?: number | null;
  durationMinutes: number;
  nonstopDurationMinutes: number;
  fuelSurchargeMinor: number;
  /** Typical carrier fuel fee for this route class — used for the <10% flag. */
  typicalFuelFeeMinor: number;
}

export interface FlightRoute {
  id: string;
  origin: AirportRef;
  destination: AirportRef;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  cabinClass: CabinClass;
  stops: 0 | 1;
  layoverAirport: string | null;
  /** Layover duration in minutes when stops = 1. */
  layoverMinutes: number | null;
  durationMinutes: number;
  nonstopDurationMinutes: number;
  originalRetailMinor: number;
  currentPriceMinor: number;
  sixtyDayMedianMinor: number;
  lowestEverMinor: number;
  currency: Currency;
  seatsRemaining: number;
  fuelSurchargeMinor: number;
  typicalFuelFeeMinor: number;
  isGlitch: boolean;
  validUntilHours: number;
  observedHours: number;
  bookingUrl: string;
  region: Region;
  isSponsored?: boolean;
  sponsorCpmMinor?: number;
  lastCheckedAt?: string;
  /** Computed engine outputs (always present on enriched routes). */
  glitchScore: number;
  glitchScoreParts: GlitchScoreParts;
  discountPercent: number;
}

export interface PricePoint {
  /** ISO date (UTC). */
  date: string;
  priceMinor: number;
  source: "model" | "rapidapi" | "database" | "cron";
}

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isPro: boolean;
  planTier: PlanTier;
  telegramChatId: string | null;
  whatsappPhone: string | null;
  customRoutesCount: number;
  authProvider: string;
  createdAt: string;
}

export interface Watchlist {
  id: string;
  userId: string;
  originCode: string;
  destinationCode: string | null;
  maxPriceMinor: number | null;
  minDiscountPercent: number | null;
  notifyChannel: NotifyChannel;
  destinationAddress: string | null;
  isActive: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
}

export interface AlertEventRecord {
  id: string;
  watchlistId: string;
  routeId: string;
  channel: NotifyChannel;
  status: "delivered" | "queued" | "simulated" | "failed";
  latencyMs: number | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface CronAuditReport {
  startedAt: string;
  finishedAt?: string;
  source: "database" | "fallback" | "mixed";
  provider: "rapidapi-live" | "rapidapi-unavailable" | "simulation";
  routesScanned: number;
  routesRefreshed: number;
  samplesAppended: number;
  watchlistsEvaluated: number;
  matches: Array<{
    watchlistId: string;
    routeId: string;
    reason: string;
    channel: NotifyChannel;
    status: string;
    latencyMs: number;
  }>;
  alertsDispatched: number;
  durationMs: number;
}

export const AIRPORTS: Array<{ code: string; city: string; country: string }> = [
  { code: "BLR", city: "Bangalore", country: "India" },
  { code: "DEL", city: "New Delhi", country: "India" },
  { code: "BOM", city: "Mumbai", country: "India" },
  { code: "HYD", city: "Hyderabad", country: "India" },
  { code: "GOI", city: "Goa / Mopa", country: "India" },
  { code: "SIN", city: "Singapore", country: "Singapore" },
  { code: "DXB", city: "Dubai", country: "UAE" },
  { code: "JFK", city: "New York", country: "USA" },
  { code: "LHR", city: "London", country: "UK" },
  { code: "DPS", city: "Bali / Denpasar", country: "Indonesia" },
  { code: "HAN", city: "Hanoi", country: "Vietnam" },
  { code: "BKK", city: "Bangkok", country: "Thailand" },
  { code: "HND", city: "Tokyo / Haneda", country: "Japan" },
  { code: "CDG", city: "Paris", country: "France" },
  { code: "MLE", city: "Malé", country: "Maldives" },
];

export const REGIONS: Array<{ id: Region; label: string }> = [
  { id: "asia", label: "Asia & Pacific" },
  { id: "europe", label: "Europe" },
  { id: "middle-east", label: "Middle East" },
  { id: "domestic-india", label: "Domestic India" },
  { id: "americas", label: "Americas" },
];

export const DISCOUNT_BRACKETS: Array<{ id: string; label: string; short: string }> = [
  { id: "40-percent-off", label: "40%+ off retail", short: "40%+" },
  { id: "50-percent-off", label: "50%+ off retail", short: "50%+" },
  { id: "60-percent-off", label: "60%+ off retail", short: "60%+" },
  { id: "under-10000", label: "Under ₹10,000", short: "<₹10k" },
];

export function bracketMatches(bracket: string, route: FlightRoute): boolean {
  switch (bracket) {
    case "40-percent-off":
      return route.discountPercent >= 40;
    case "50-percent-off":
      return route.discountPercent >= 50;
    case "60-percent-off":
      return route.discountPercent >= 60;
    case "under-10000":
      return route.currency === "INR" && route.currentPriceMinor < 1_000_000;
    default:
      return false;
  }
}
