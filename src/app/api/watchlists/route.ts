import { getCurrentUser } from "@/lib/auth/current-user";
import { createWatchlist, listWatchlists } from "@/lib/queries";
import type { NotifyChannel } from "@/lib/types";

export const dynamic = "force-dynamic";

/** List the caller's watchlists. */
export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return Response.json({ ok: false, error: "auth_required" }, { status: 401 });
  }
  const watchlists = await listWatchlists(current.user.id);
  return Response.json({ ok: true, count: watchlists.length, watchlists });
}

const CHANNELS: NotifyChannel[] = ["telegram", "whatsapp", "email"];
const IATA_RE = /^[A-Za-z]{3}$/;

/** Create a watchlist. Requires at least one matching criterion. */
export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return Response.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const originCode = typeof body.originCode === "string" ? body.originCode.toUpperCase() : "";
  if (!IATA_RE.test(originCode)) {
    return Response.json({ ok: false, error: "invalid_origin" }, { status: 400 });
  }

  let destinationCode: string | null = null;
  if (typeof body.destinationCode === "string" && body.destinationCode.trim()) {
    const d = body.destinationCode.toUpperCase();
    if (d !== "ANY" && !IATA_RE.test(d)) {
      return Response.json({ ok: false, error: "invalid_destination" }, { status: 400 });
    }
    destinationCode = d === "ANY" ? null : d;
  }

  const maxPrice = typeof body.maxPrice === "number" ? body.maxPrice : NaN;
  const maxPriceMinor = Number.isFinite(maxPrice) && maxPrice > 0 ? Math.round(maxPrice * 100) : null;

  const minDiscount = typeof body.minDiscountPercent === "number" ? body.minDiscountPercent : NaN;
  const minDiscountPercent =
    Number.isFinite(minDiscount) && minDiscount >= 20 && minDiscount <= 95 ? minDiscount : null;

  if (maxPriceMinor === null && minDiscountPercent === null) {
    return Response.json(
      { ok: false, error: "criterion_required", hint: "set maxPrice and/or minDiscountPercent" },
      { status: 400 }
    );
  }

  const channel = CHANNELS.includes(body.notifyChannel as NotifyChannel)
    ? (body.notifyChannel as NotifyChannel)
    : "email";

  const watchlist = await createWatchlist({
    userId: current.user.id,
    originCode,
    destinationCode,
    maxPriceMinor,
    minDiscountPercent,
    notifyChannel: channel,
    destinationAddress:
      typeof body.destinationAddress === "string" ? body.destinationAddress.slice(0, 400) : null,
  });

  return Response.json({ ok: true, watchlist }, { status: 201 });
}
