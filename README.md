# ⚡ FlyGlitch AI

Institutional-grade, real-time **flight price glitch, fuel-dump anomaly & mistake-fare arbitrage radar**.

Dark aviation-terminal UI · Glitch Score engine (0–100) · 30-route verified catalog · magic-link auth · dual Razorpay/Stripe billing · Telegram/WhatsApp/email dispatch · programmatic SEO with dynamic OG cards.

## Run

```bash
npm install
npm run build
npm run start
```

That's it. The platform is **resilient by design**:

| Dependency | Offline behaviour |
|---|---|
| PostgreSQL | All queries degrade to the verified 30-route catalog + global in-memory stores (profiles, sessions, watchlists, newsletter). 3s connection timeout, 15s negative caching. |
| `RAPIDAPI_KEY` | Cron falls back to deterministic market-tick simulation. |
| `RESEND_API_KEY` | `/api/auth/magic-link` returns `{ delivery: "preview_link", verifyUrl }` for instant testing. |
| `RAZORPAY_*` / `STRIPE_*` | Checkout issues an HMAC-signed sandbox token → `/api/billing/sandbox-activate` upgrades you to Club Pro. |
| `TELEGRAM_BOT_TOKEN` / `WHATSAPP_TOKEN` | Dispatch pipeline simulates delivery with measured latency. |

## Stack

Next.js (App Router, React 19) · Drizzle ORM + PostgreSQL · Tailwind CSS v4 · zero other runtime deps.

## Glitch Score

```
GlitchScore = 0.45·S_deviation + 0.25·S_velocity + 0.15·S_convenience + 0.15·S_fuel
              + B_floor(≤ all-time low: +15) − P_layover(>2.5× nonstop: −20)
```

- `S_deviation` — discount vs trailing 60-day median, ×125, capped 100
- `S_velocity` — lowest-bucket seat drain (seats left × observation window)
- `S_convenience` — nonstop 100 / short layover 75 / long layover 30
- `S_fuel` — YQ/YR surcharge < 10% of typical carrier fee → fuel-dump flag

Score ≥ 85 **and** ≥ 55% off retail → `isGlitch = true`.

## Key endpoints

| Route | Purpose |
|---|---|
| `GET /api/health` | Health probe (always 200; reports fallback mode) |
| `GET /api/routes` | Filterable radar feed (`origin`, `destination`, `maxPrice`, `nonstop`, `minDiscount`, `sort`) |
| `GET /api/flight/[id]/history` | 60-day fare tape + stats |
| `GET /api/go/flight/[id]` | Affiliate click tracking + 307 redirect |
| `POST /api/auth/magic-link` → `GET /api/auth/verify` | Passwordless auth, 15-min single-use token, HMAC-signed `fg_session` cookie |
| `POST /api/billing/checkout` | Razorpay → payment-link → Stripe → sandbox token cascade |
| `POST /api/webhooks/razorpay` · `POST /api/webhooks/stripe` | HMAC-verified upgrades/downgrades |
| `GET|POST /api/cron/refresh-routes` | Re-score, append samples, match tripwires, dispatch, audit report |
| `GET /api/og` | Dynamic boarding-pass OpenGraph cards |

## Env (all optional)

```
DATABASE_URL, RAPIDAPI_KEY, RESEND_API_KEY, SESSION_SECRET, CRON_SECRET,
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_PLAN_ID_INR, RAZORPAY_WEBHOOK_SECRET,
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_PRO,
TELEGRAM_BOT_TOKEN, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
```

## Schema

`routes · price_history · profiles · user_watchlists · subscriptions · affiliate_clicks · newsletter_subscribers · alert_events · system_state` — all money in integer minor units. Apply with `npx drizzle-kit push`.

See `SPEC.md` for the full product specification.
