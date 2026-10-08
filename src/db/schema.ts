import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * FlyGlitch AI — PostgreSQL schema.
 * All monetary values are stored as integer minor units (paise / cents) to
 * avoid floating point drift in financial comparisons.
 */

export const routes = pgTable("routes", {
  id: text("id").primaryKey(),
  originCode: text("origin_code").notNull(),
  originCity: text("origin_city").notNull(),
  originCountry: text("origin_country").notNull().default("India"),
  originTerminal: text("origin_terminal"),
  destinationCode: text("destination_code").notNull(),
  destinationCity: text("destination_city").notNull(),
  destinationCountry: text("destination_country").notNull().default("India"),
  airlineName: text("airline_name").notNull(),
  airlineCode: text("airline_code").notNull().default(""),
  flightNumber: text("flight_number").notNull(),
  cabinClass: text("cabin_class").notNull().default("economy"),
  stops: integer("stops").notNull().default(0),
  layoverCode: text("layover_code"),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  retailPriceMinor: integer("retail_price_minor").notNull().default(0),
  currentPriceMinor: integer("current_price_minor").notNull().default(0),
  sixtyDayMedianMinor: integer("sixty_day_median_minor").notNull().default(0),
  lowestEverMinor: integer("lowest_ever_minor").notNull().default(0),
  fuelSurchargeMinor: integer("fuel_surcharge_minor").notNull().default(0),
  typicalFuelFeeMinor: integer("typical_fuel_fee_minor").notNull().default(0),
  nonstopDurationMinutes: integer("nonstop_duration_minutes").notNull().default(0),
  observedHours: doublePrecision("observed_hours").notNull().default(1),
  discountPercent: doublePrecision("discount_percent").notNull().default(0),
  glitchScore: doublePrecision("glitch_score").notNull().default(0),
  glitchScoreParts: jsonb("glitch_score_parts").$type<Record<string, number>>(),
  seatsRemaining: integer("seats_remaining").notNull().default(9),
  validUntilHours: integer("valid_until_hours").notNull().default(6),
  isGlitch: boolean("is_glitch").notNull().default(false),
  isSponsored: boolean("is_sponsored").notNull().default(false),
  sponsorCpmMinor: integer("sponsor_cpm_minor").notNull().default(0),
  region: text("region").notNull().default("asia"),
  bookingUrl: text("booking_url").notNull().default(""),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const priceHistory = pgTable("price_history", {
  id: text("id").primaryKey(),
  routeId: text("route_id")
    .notNull()
    .references(() => routes.id, { onDelete: "cascade" }),
  priceMinor: integer("price_minor").notNull(),
  source: text("source").notNull().default("fallback"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  isPro: boolean("is_pro").notNull().default(false),
  planTier: text("plan_tier").notNull().default("free"),
  telegramChatId: text("telegram_chat_id"),
  whatsappPhone: text("whatsapp_phone"),
  customRoutesCount: integer("custom_routes_count").notNull().default(0),
  authProvider: text("auth_provider").notNull().default("magic-link"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userWatchlists = pgTable("user_watchlists", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  originCode: text("origin_code").notNull(),
  destinationCode: text("destination_code"),
  maxPriceMinor: integer("max_price_minor"),
  minDiscountPercent: doublePrecision("min_discount_percent"),
  notifyChannel: text("notify_channel").notNull().default("email"),
  destinationAddress: text("destination_address"),
  isActive: boolean("is_active").notNull().default(true),
  lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("sandbox"),
  subscriptionId: text("subscription_id"),
  status: text("status").notNull().default("active"),
  amountMinor: integer("amount_minor").notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  rawEvents: jsonb("raw_events").$type<unknown[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  routeId: text("route_id").notNull(),
  originCode: text("origin_code").notNull(),
  destinationCode: text("destination_code").notNull(),
  airline: text("airline").notNull().default(""),
  partner: text("partner").notNull().default("google-flights"),
  targetUrl: text("target_url").notNull().default(""),
  ipHash: text("ip_hash"),
  utmCampaign: text("utm_campaign"),
  clickedAt: timestamp("clicked_at", { withTimezone: true }).defaultNow(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  homeAirport: text("home_airport"),
  status: text("status").notNull().default("subscribed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const alertEvents = pgTable("alert_events", {
  id: text("id").primaryKey(),
  watchlistId: text("watchlist_id"),
  routeId: text("route_id"),
  channel: text("channel").notNull().default("email"),
  status: text("status").notNull().default("queued"),
  latencyMs: integer("latency_ms"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const systemState = pgTable("system_state", {
  stateKey: text("state_key").primaryKey(),
  value: jsonb("value").$type<unknown>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type RouteRow = typeof routes.$inferSelect;
export type ProfileRow = typeof profiles.$inferSelect;
export type WatchlistRow = typeof userWatchlists.$inferSelect;
export type PriceHistoryRow = typeof priceHistory.$inferSelect;
