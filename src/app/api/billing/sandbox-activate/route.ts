import { NextResponse } from "next/server";
import { verifySandboxToken, PRO_PRICE_INR_MINOR } from "@/lib/billing";
import { upgradeProfileToPro } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Zero-payment-rails activation. Verifies the HMAC-signed token minted by the
 * checkout router and upgrades the profile to Club Pro in sandbox mode.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const payload = verifySandboxToken(token);

  if (!payload) {
    return NextResponse.redirect(new URL("/dashboard?err=sandbox_invalid", url), 303);
  }

  await upgradeProfileToPro(payload.uid, {
    provider: "sandbox",
    subscriptionId: `sandbox_${payload.uid}`,
    amountMinor: 0,
    currency: "INR",
    periodEnd: new Date(Date.now() + 30 * 86_400_000),
  });

  const res = NextResponse.redirect(
    new URL(`/dashboard?pro=1&sandbox=1&value=${PRO_PRICE_INR_MINOR}`, url),
    303
  );
  return res;
}
