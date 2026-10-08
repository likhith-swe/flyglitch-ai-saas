import { createHmac, timingSafeEqual } from "crypto";
import { env } from "./env";
import type { Profile } from "./types";

/**
 * Dual Razorpay + Stripe billing engine with an HMAC-signed sandbox fallback
 * so Club Pro can always be activated even with zero payment credentials.
 */

export const PRO_PRICE_INR_MINOR = 49_900; // ₹499 / month
export const PRO_PRICE_USD_MINOR = 900; // $9 / month

export type CheckoutMode =
  | "razorpay_subscription"
  | "razorpay_payment_link"
  | "stripe_checkout"
  | "sandbox_token";

export interface CheckoutResult {
  mode: CheckoutMode;
  /** Redirect / hosted URL when the provider supplies one. */
  url?: string;
  /** Provider object id (subscription / payment link / checkout session). */
  providerId?: string;
  /** HMAC-signed token for the zero-credentials sandbox flow. */
  sandboxToken?: string;
  notes: string[];
}

function razorpayAuth(): string | null {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;
  return `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`;
}

async function postWithTimeout(url: string, init: RequestInit, timeoutMs = 8_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checkout router:
 *  INR  -> Razorpay subscription (when a plan id is provisioned), otherwise a
 *          hosted ₹499 payment link.
 *  USD  -> Stripe Checkout Session at $9/mo.
 *  None -> HMAC-signed sandbox activation token.
 */
export async function startCheckout(
  profile: Profile,
  currency: "INR" | "USD"
): Promise<CheckoutResult> {
  const notes: string[] = [];

  if (currency === "INR" && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    const auth = razorpayAuth() as string;

    if (env.RAZORPAY_PLAN_ID_INR) {
      try {
        const res = await postWithTimeout("https://api.razorpay.com/v1/subscriptions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: auth },
          body: JSON.stringify({
            plan_id: env.RAZORPAY_PLAN_ID_INR,
            total_count: 12,
            quantity: 1,
            customer_notify: 1,
            notes: { user_id: profile.id, email: profile.email },
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { id?: string; short_url?: string };
          if (data.id) {
            return {
              mode: "razorpay_subscription",
              providerId: data.id,
              url: data.short_url,
              notes: ["Razorpay subscription created against provisioned plan"],
            };
          }
        }
        notes.push(`razorpay subscription init failed (${res.status}) — falling back to payment link`);
      } catch {
        notes.push("razorpay subscription init unreachable — falling back to payment link");
      }
    } else {
      notes.push("RAZORPAY_PLAN_ID_INR not provisioned — using hosted payment link");
    }

    try {
      const res = await postWithTimeout("https://api.razorpay.com/v1/payment_links", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: auth },
        body: JSON.stringify({
          amount: PRO_PRICE_INR_MINOR,
          currency: "INR",
          description: "FlyGlitch Club Pro — 1 month",
          customer: { email: profile.email },
          notify: { email: true },
          reminder_enable: true,
          notes: { user_id: profile.id, plan: "club_pro" },
          callback_url: `${env.APP_URL}/dashboard?pro=1`,
          callback_method: "get",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string; short_url?: string };
        if (data.id) {
          return {
            mode: "razorpay_payment_link",
            providerId: data.id,
            url: data.short_url,
            notes,
          };
        }
      }
      notes.push(`razorpay payment link failed (${res.status}) — using direct payment link`);
    } catch {
      notes.push("razorpay payment link unreachable — using direct payment link");
    }
    return {
      mode: "razorpay_payment_link",
      url: "https://razorpay.me/@likhiths",
      notes: ["Using direct Razorpay payment link: https://razorpay.me/@likhiths"],
    };
  }

  if (currency === "INR") {
    return {
      mode: "razorpay_payment_link",
      url: "https://razorpay.me/@likhiths",
      notes: ["Direct Razorpay payment link (India ₹499/mo)"],
    };
  }

  if (currency === "USD" && env.STRIPE_SECRET_KEY) {
    try {
      const body = new URLSearchParams();
      body.set("mode", "subscription");
      body.set("success_url", `${env.APP_URL}/dashboard?pro=1`);
      body.set("cancel_url", `${env.APP_URL}/dashboard`);
      body.set("customer_email", profile.email);
      body.set("client_reference_id", profile.id);
      if (env.STRIPE_PRICE_ID_PRO) {
        body.set("line_items[0][price]", env.STRIPE_PRICE_ID_PRO);
        body.set("line_items[0][quantity]", "1");
      } else {
        body.set("line_items[0][quantity]", "1");
        body.set("line_items[0][price_data][currency]", "usd");
        body.set("line_items[0][price_data][unit_amount]", String(PRO_PRICE_USD_MINOR));
        body.set("line_items[0][price_data][recurring][interval]", "month");
        body.set("line_items[0][price_data][product_data][name]", "FlyGlitch Club Pro");
      }
      const res = await postWithTimeout("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        },
        body: body.toString(),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string; url?: string };
        if (data.id) {
          return { mode: "stripe_checkout", providerId: data.id, url: data.url, notes };
        }
      }
      notes.push(`stripe checkout init failed (${res.status}) — falling back to sandbox activation`);
    } catch {
      notes.push("stripe unreachable — falling back to sandbox activation");
    }
  }

  if (currency === "INR" && !env.RAZORPAY_KEY_ID) notes.push("Razorpay credentials absent");
  if (currency === "USD" && !env.STRIPE_SECRET_KEY) notes.push("Stripe credentials absent");
  notes.push("sandbox activation token issued — Club Pro activates without payment rails");
  return {
    mode: "sandbox_token",
    sandboxToken: createSandboxToken(profile.id, profile.email),
    notes,
  };
}

/* ------------------------------------------------------------- sandbox */

interface SandboxPayload {
  uid: string;
  email: string;
  iat: number;
  exp: number;
}

export function createSandboxToken(userId: string, email: string): string {
  const iat = Date.now();
  const payload: SandboxPayload = { uid: userId, email, iat, exp: iat + 30 * 60 * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", env.BILLING_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySandboxToken(token: string): SandboxPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", env.BILLING_SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SandboxPayload;
    if (!payload.uid || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------- webhook signature */

/** HMAC-SHA256 over the raw body with RAZORPAY_WEBHOOK_SECRET. */
export function verifyRazorpaySignature(rawBody: Buffer, signature: string | null): boolean {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Stripe `Stripe-Signature: t=...,v1=...` verification (5 min tolerance). */
export function verifyStripeSignature(
  rawBody: Buffer,
  headerValue: string | null,
  secret: string | null
): boolean {
  if (!headerValue || !secret) return false;
  const parts = Object.fromEntries(
    headerValue.split(",").map((kv) => kv.split("=").map((v) => v.trim()) as [string, string])
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const timestamp = Number(t);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody.toString("utf8")}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
