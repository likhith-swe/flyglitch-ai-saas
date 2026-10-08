# FlyGlitch AI — Product Specification

## 1. Mission

Airlines price via dynamic revenue-management stacks (Sabre / Amadeus / PROS). Fare anomalies leak
through three structural cracks:

1. **Currency conversion mismatch** across point-of-sale countries.
2. **Fuel surcharge (YQ/YR) omission** when multi-segment legs cross unaligned alliances — "fuel dumping".
3. **OTA cache latency** dumping seats at stale G/Q/V fare buckets.

FlyGlitch AI detects these anomalies, scores them, and dispatches alerts before carriers patch them
(typically 1–12h windows).

## 2. Glitch Scoring Engine (`src/lib/glitch-score.ts`)

```
GlitchScore = 0.45·S_deviation + 0.25·S_velocity + 0.15·S_convenience + 0.15·S_fuel
              + B_floor − P_layover          (normalized 0..100)
```

| Signal | Definition |
|---|---|
| `S_deviation` | `clamp(((median60 − price) / median60) · 125, 0, 100)` |
| `S_velocity` | Seat-drain speed of lowest bucket: 65% weight on seats-remaining ratio, 35% on drain recency |
| `S_convenience` | Nonstop 100 · layover <3h 75 · 3–6h 55 · >6h 30 |
| `S_fuel` | 100 when YQ/YR < 10% of typical carrier fee; linear decay to parity |
| `B_floor` | +15 when `price ≤ lowestEverRecorded` |
| `P_layover` | −20 when total travel time > 2.5× nonstop duration |

Classification: `score ≥ 85 && discount ≥ 55%` → `isGlitch = true`.

## 3. Verified Offline Catalog (`src/lib/fallback-routes.ts`)

30 routes from BLR / DEL / BOM / HYD / SIN / DXB / JFK / LHR. Each route carries full economics
(retail, 60-day median, all-time low, fuel surcharge vs typical fee, seats, correction ETA) in
integer minor units, plus `buildFlightPriceHistory()` producing a deterministic 60-day curve
(baseline noise → peak-season surge → gradual descent → precise collapse onto the glitch price).

## 4. Data Layer

- `src/db/schema.ts` — 9 tables, all money as integer minor units, jsonb score parts / webhook events.
- `src/db/index.ts` — pg Pool with 3000ms connection timeout, availability probe with 15s negative
  cache, `withDb(op, fallback)` wrapper. **Offline Postgres can never hang builds or requests.**
- `src/lib/queries.ts` — unified access layer: Postgres when up, global in-memory stores otherwise.

## 5. Auth

- `POST /api/auth/magic-link` — single-use 15-min token. Without `RESEND_API_KEY` returns
  `preview_link` + `verifyUrl` for instant QA; with it, dispatches branded HTML email.
- `GET /api/auth/verify` — consumes token, upserts profile, sets HMAC-signed HTTP-only `fg_session`
  cookie (stateless verification survives restarts; in-memory Maps keep full offline parity), 303 → `/dashboard`.

## 6. Billing

Checkout router cascade:

1. INR + Razorpay plan provisioned → `POST /v1/subscriptions`
2. INR fallback → hosted ₹499 `payment_link`
3. USD + Stripe → Checkout Session $9/mo (price id or inline price_data)
4. Nothing provisioned → HMAC-signed sandbox token → `/api/billing/sandbox-activate` → Club Pro

Webhooks: Razorpay (`x-razorpay-signature` HMAC-SHA256 over raw body) handles
`subscription.activated | subscription.charged | payment.captured` (upgrade) and
`subscription.cancelled | payment.failed` (downgrade), plus a GET config probe. Stripe webhook
verifies `Stripe-Signature` (t/v1, 5-min tolerance) and upgrades on `checkout.session.completed`.

## 7. SEO

- `/flights/[origin]/[destination]` — statically generated for all 30 catalog pairs (ISR 15m).
- `/routes/[region]/[discount]` — 5 regions × 4 brackets = 20 hub pages.
- `/flight/[id]` — detail pages with full fare tape.
- Schema.org `FlightReservation`, `Product`, `FAQPage`, `BreadcrumbList` JSON-LD on all templates.
- `/api/og` — dynamic 1200×630 boarding-pass card: IATA pair, carrier, slashed retail vs glitch
  price, `⚡ SCORE` badge.

## 8. Cron Pipeline (`/api/cron/refresh-routes`)

`CRON_SECRET` header auth (open mode when unset) → RapidAPI enrichment or simulated market tick →
Glitch re-score → `price_history` sample append → watchlist matching
(`price ≤ target OR discount ≥ min`, 30-min storm guard) → Telegram Bot / WhatsApp Cloud / Resend
dispatch with latency measurement → `alert_events` audit trail + `system_state` persistence → full
execution report JSON.

## 9. UI System

`#07090e` terminal black · `rgba(255,255,255,0.08)` slate borders · `#10b981` glitch emerald ·
`#f59e0b` urgency amber · JetBrains Mono for IATA/flight numbers · Space Grotesk for display.

Landing = live ticker marquee → hero search console (origin/destination/budget/nonstop) → score-
sorted radar grid (seat counters, correction countdowns, 60-day history modal with SVG curves,
affiliate-tracked Claim buttons) → Free vs Club Pro comparison → 5-channel revenue model → FAQ.

## 10. Monetization (disclosed in-app)

Affiliate CPA on claim clicks · sponsored route CPM · Club Pro subscriptions (₹499 / $9) ·
newsletter sponsor slots · fare-intelligence API licensing.
