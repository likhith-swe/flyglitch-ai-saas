import { getCurrentUser } from "@/lib/auth/current-user";
import { startCheckout } from "@/lib/billing";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * Checkout router — routes to Razorpay (INR), Stripe (USD) or the
 * HMAC-signed sandbox activation flow depending on provisioned credentials.
 */
export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return Response.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = checkRateLimit(`checkout:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: { currency?: unknown } = {};
  try {
    body = (await req.json()) as { currency?: unknown };
  } catch {
    body = {};
  }
  const currency: "INR" | "USD" = body.currency === "USD" ? "USD" : "INR";

  const result = await startCheckout(current.user, currency);
  const payload: Record<string, unknown> = {
    ok: true,
    mode: result.mode,
    currency,
    notes: result.notes,
  };
  if (result.url) payload.checkoutUrl = result.url;
  if (result.providerId) payload.providerId = result.providerId;
  if (result.mode === "sandbox_token" && result.sandboxToken) {
    payload.activateUrl = `${env.APP_URL}/api/billing/sandbox-activate?token=${encodeURIComponent(result.sandboxToken)}`;
  }
  return Response.json(payload);
}
