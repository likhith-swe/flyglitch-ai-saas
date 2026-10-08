import { checkRateLimit } from "@/lib/ratelimit";
import { subscribeNewsletter } from "@/lib/queries";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Weekly drop report signup — Postgres when online, in-memory otherwise. */
export async function POST(req: Request) {
  let body: { email?: unknown; homeAirport?: unknown } = {};
  try {
    body = (await req.json()) as { email?: unknown; homeAirport?: unknown };
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = checkRateLimit(`newsletter:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const homeAirport =
    typeof body.homeAirport === "string" && /^[A-Za-z]{3}$/.test(body.homeAirport)
      ? body.homeAirport.toUpperCase()
      : null;

  const result = await subscribeNewsletter(email, homeAirport);
  return Response.json({
    ok: result.ok,
    alreadySubscribed: result.alreadySubscribed,
    email,
    homeAirport,
  });
}
