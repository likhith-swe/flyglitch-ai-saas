import { verifyStripeSignature, PRO_PRICE_USD_MINOR } from "@/lib/billing";
import { env, paymentsFeatureStatus } from "@/lib/env";
import { upgradeProfileToPro } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** GET probe for parity with the Razorpay webhook. */
export async function GET() {
  const status = paymentsFeatureStatus();
  return Response.json({
    ok: true,
    webhook: "stripe",
    configured: status.stripe,
    signatureVerification: status.stripeWebhook,
  });
}

interface StripeEvent {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
}

/**
 * Stripe webhook — verifies Stripe-Signature (t=…,v1=…) when
 * STRIPE_WEBHOOK_SECRET is provisioned, then upgrades Club Pro on
 * checkout.session.completed.
 */
export async function POST(req: Request) {
  const raw = Buffer.from(await req.arrayBuffer());

  let verified: boolean;
  if (env.STRIPE_WEBHOOK_SECRET) {
    verified = verifyStripeSignature(raw, req.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
    if (!verified) {
      return Response.json({ ok: false, error: "invalid_signature" }, { status: 400 });
    }
  } else {
    verified = false;
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw.toString("utf8")) as StripeEvent;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const type = event.type ?? "unknown";
  const obj = event.data?.object ?? {};
  const userId = typeof obj.client_reference_id === "string" ? obj.client_reference_id : null;
  const subscriptionId =
    typeof obj.subscription === "string"
      ? obj.subscription
      : typeof obj.id === "string"
        ? obj.id
        : null;

  try {
    if (type === "checkout.session.completed" && userId) {
      await upgradeProfileToPro(userId, {
        provider: "stripe",
        subscriptionId,
        amountMinor: PRO_PRICE_USD_MINOR,
        currency: "USD",
        periodEnd: new Date(Date.now() + 30 * 86_400_000),
      });
    }
    if (type === "customer.subscription.deleted" && userId) {
      const { downgradeProfile } = await import("@/lib/queries");
      await downgradeProfile(userId);
    }
  } catch {
    return Response.json({ ok: false, error: "processing_error" }, { status: 500 });
  }

  return Response.json({ ok: true, handled: type, verified, upgradedUser: userId });
}
