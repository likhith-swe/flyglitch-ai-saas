import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/ratelimit";
import { createMagicToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Passwordless magic-link issuance. Single-use token, valid 15 minutes.
 * Without RESEND_API_KEY the verify URL is returned inline for instant
 * testing; with it, a branded HTML email is dispatched via Resend.
 */
export async function POST(req: Request) {
  let body: { email?: unknown } = {};
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = checkRateLimit(`magic:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return Response.json(
      { ok: false, error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429 }
    );
  }

  const { token, expiresAt } = createMagicToken(email);
  const verifyUrl = `${env.APP_URL}/api/auth/verify?token=${encodeURIComponent(token)}`;

  if (env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "FlyGlitch AI <login@flyglitch.app>",
          to: [email],
          subject: "⚡ Your FlyGlitch sign-in link (valid 15 minutes)",
          html: `
            <div style="background:#07090e;color:#e2e8f0;padding:40px;font-family:monospace">
              <h1 style="color:#10b981">⚡ FlyGlitch AI</h1>
              <p>Confirm your email to enter the glitch radar.</p>
              <a href="${verifyUrl}" style="display:inline-block;background:#10b981;color:#04120c;padding:14px 28px;border-radius:8px;font-weight:bold;text-decoration:none">SIGN IN → GLITCH RADAR</a>
              <p style="color:#64748b;font-size:12px">Single-use link · expires ${new Date(expiresAt).toUTCString()}</p>
            </div>`,
        }),
      });
      return Response.json({ ok: true, delivery: "email", expiresInMin: 15 });
    } catch {
      return Response.json({
        ok: true,
        delivery: "preview_link",
        verifyUrl,
        note: "resend dispatch failed — preview link returned instead",
        expiresInMin: 15,
      });
    }
  }

  return Response.json({ ok: true, delivery: "preview_link", verifyUrl, expiresInMin: 15 });
}
