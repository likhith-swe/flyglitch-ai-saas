import { verifyRazorpaySignature, PRO_PRICE_INR_MINOR } from "@/lib/billing";
import { env, paymentsFeatureStatus } from "@/lib/env";
import { upgradeProfileToPro, downgradeProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** GET probe — configuration status without touching any secrets. */
export async function GET() {
  const status = paymentsFeatureStatus();
  return Response.json({
    ok: true,
    webhook: "razorpay",
    configured: status.razorpay,
    signatureVerification: status.razorpayWebhook,
    planProvisioned: status.razorpayPlan,
  });
}

interface RazorpayEvent {
  event?: string;
  payload?: {
    subscription?: { entity?: Record<string, unknown> };
    payment?: { entity?: Record<string, unknown> };
  };
}

function notesUserId(entity: Record<string, unknown> | undefined): string | null {
  const notes = entity?.notes as Record<string, unknown> | undefined;
  const uid = notes?.user_id;
  return typeof uid === "string" && uid.length > 0 ? uid : null;
}

/**
 * Razorpay webhook — verifies x-razorpay-signature (HMAC-SHA256 over the raw
 * body) when RAZORPAY_WEBHOOK_SECRET is provisioned, then upgrades on
 * subscription.activated / subscription.charged / payment.captured and
 * downgrades on subscription.cancelled / payment.failed.
 */
export async function POST(req: Request) {
  const raw = Buffer.from(await req.arrayBuffer());
  const signature = req.headers.get("x-razorpay-signature");

  let verified: boolean;
  if (env.RAZORPAY_WEBHOOK_SECRET) {
    verified = verifyRazorpaySignature(raw, signature);
    if (!verified) {
      return Response.json({ ok: false, error: "invalid_signature" }, { status: 400 });
    }
  } else {
    // Unprovisioned sandbox mode: accept but flag as unverified.
    verified = false;
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw.toString("utf8")) as RazorpayEvent;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const type = event.event ?? "unknown";
  const subEntity = event.payload?.subscription?.entity;
  const payEntity = event.payload?.payment?.entity;
  const userId = notesUserId(subEntity) ?? notesUserId(payEntity);
  const subscriptionId =
    (subEntity?.id as string | undefined) ?? (payEntity?.subscription_id as string | undefined) ?? null;

  try {
    switch (type) {
      case "subscription.activated":
      case "subscription.charged":
      case "payment.captured": {
        if (userId) {
          const endAt =
            typeof subEntity?.current_end === "number"
              ? new Date(subEntity.current_end * 1000)
              : new Date(Date.now() + 30 * 86_400_000);
          await upgradeProfileToPro(userId, {
            provider: "razorpay",
            subscriptionId,
            amountMinor:
              typeof payEntity?.amount === "number" ? payEntity.amount : PRO_PRICE_INR_MINOR,
            currency: "INR",
            periodEnd: endAt,
          });
        }
        break;
      }
      case "subscription.cancelled":
      case "payment.failed": {
        if (userId) await downgradeProfile(userId);
        break;
      }
      default:
        break;
    }
  } catch {
    return Response.json({ ok: false, error: "processing_error" }, { status: 500 });
  }

  return Response.json({ ok: true, handled: type, verified, upgradedUser: userId });
}
