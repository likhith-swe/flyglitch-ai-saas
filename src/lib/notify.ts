import { env } from "./env";
import { formatMoney } from "./format";
import type { FlightRoute, NotifyChannel, Profile, Watchlist } from "./types";

/**
 * Alert dispatch pipeline: Telegram Bot API, WhatsApp Business Cloud API and
 * transactional email (Resend). Every channel degrades to a simulated
 * delivery with measured latency when credentials are absent, so the cron
 * pipeline always completes.
 */

export interface DispatchResult {
  status: "delivered" | "simulated" | "failed";
  latencyMs: number;
  channel: NotifyChannel;
  detail: string;
}

export function buildAlertText(route: FlightRoute): string {
  const price = formatMoney(route.currentPriceMinor, route.currency);
  const retail = formatMoney(route.originalRetailMinor, route.currency);
  return (
    `⚡ FLYGLITCH RADAR — ${route.isGlitch ? "GLITCH CONFIRMED" : "FARE ANOMALY"}\n` +
    `${route.origin.code} → ${route.destination.code} · ${route.airline} ${route.flightNumber}\n` +
    `${price} (was ${retail}) — ${Math.round(route.discountPercent)}% OFF\n` +
    `Glitch Score ${Math.round(route.glitchScore)}/100 · ${route.seatsRemaining} seats left · ` +
    `est. correction in ~${route.validUntilHours}h\n` +
    `Book now before the airline patches this fare.`
  );
}

async function postWithTimeout(url: string, init: RequestInit, timeoutMs = 6_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function dispatchTelegram(route: FlightRoute, profile: Profile | null): Promise<DispatchResult> {
  const started = Date.now();
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = profile?.telegramChatId ?? null;
  if (!token || !chatId) {
    await sleep(6 + Math.random() * 10);
    return {
      status: "simulated",
      latencyMs: Date.now() - started,
      channel: "telegram",
      detail: "TELEGRAM_BOT_TOKEN / chat id not provisioned — dispatch simulated",
    };
  }
  try {
    const res = await postWithTimeout(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: buildAlertText(route) }),
    });
    return {
      status: res.ok ? "delivered" : "failed",
      latencyMs: Date.now() - started,
      channel: "telegram",
      detail: res.ok ? "telegram message delivered" : `telegram responded ${res.status}`,
    };
  } catch (err) {
    return {
      status: "failed",
      latencyMs: Date.now() - started,
      channel: "telegram",
      detail: `telegram error: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

async function dispatchWhatsapp(route: FlightRoute, profile: Profile | null): Promise<DispatchResult> {
  const started = Date.now();
  const token = env.WHATSAPP_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  const to = profile?.whatsappPhone ?? null;
  if (!token || !phoneId || !to) {
    await sleep(8 + Math.random() * 12);
    return {
      status: "simulated",
      latencyMs: Date.now() - started,
      channel: "whatsapp",
      detail: "WHATSAPP_TOKEN / phone id not provisioned — dispatch simulated",
    };
  }
  try {
    const res = await postWithTimeout(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: buildAlertText(route) },
      }),
    });
    return {
      status: res.ok ? "delivered" : "failed",
      latencyMs: Date.now() - started,
      channel: "whatsapp",
      detail: res.ok ? "whatsapp message queued" : `whatsapp responded ${res.status}`,
    };
  } catch (err) {
    return {
      status: "failed",
      latencyMs: Date.now() - started,
      channel: "whatsapp",
      detail: `whatsapp error: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

async function dispatchEmail(route: FlightRoute, profile: Profile | null): Promise<DispatchResult> {
  const started = Date.now();
  const key = env.RESEND_API_KEY;
  if (!key || !profile?.email) {
    await sleep(5 + Math.random() * 10);
    return {
      status: "simulated",
      latencyMs: Date.now() - started,
      channel: "email",
      detail: "RESEND_API_KEY not provisioned — dispatch simulated",
    };
  }
  try {
    const res = await postWithTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: "FlyGlitch Radar <alerts@flyglitch.app>",
        to: [profile.email],
        subject: `⚡ ${route.origin.code}→${route.destination.code} at ${formatMoney(route.currentPriceMinor, route.currency)} (${Math.round(route.discountPercent)}% off)`,
        text: buildAlertText(route),
      }),
    });
    return {
      status: res.ok ? "delivered" : "failed",
      latencyMs: Date.now() - started,
      channel: "email",
      detail: res.ok ? "email dispatched via Resend" : `resend responded ${res.status}`,
    };
  } catch (err) {
    return {
      status: "failed",
      latencyMs: Date.now() - started,
      channel: "email",
      detail: `resend error: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

export async function dispatchAlert(opts: {
  channel: NotifyChannel;
  route: FlightRoute;
  watchlist?: Watchlist;
  profile?: Profile | null;
}): Promise<DispatchResult> {
  switch (opts.channel) {
    case "telegram":
      return dispatchTelegram(opts.route, opts.profile ?? null);
    case "whatsapp":
      return dispatchWhatsapp(opts.route, opts.profile ?? null);
    default:
      return dispatchEmail(opts.route, opts.profile ?? null);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
