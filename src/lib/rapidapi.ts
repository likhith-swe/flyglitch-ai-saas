import { env } from "./env";
import type { FlightRoute } from "./types";

/**
 * RapidAPI enrichment layer. When RAPIDAPI_KEY is present we attempt a live
 * fare quote; when it is absent (or the upstream fails) we return null so
 * callers fall back to the verified catalog + deterministic simulation.
 */

export interface LiveQuote {
  currentPriceMinor: number;
  seatsRemaining?: number;
  source: "rapidapi";
  fetchedAt: string;
}

export function rapidApiAvailable(): boolean {
  return Boolean(env.RAPIDAPI_KEY);
}

export async function fetchLiveQuote(route: FlightRoute): Promise<LiveQuote | null> {
  if (!rapidApiAvailable()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    const depart = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
    const url =
      `https://skiplagged1.p.rapidapi.com/flights/` +
      `${route.origin.code}/${route.destination.code}/${depart}/1/0/economy/0`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "x-rapidapi-key": env.RAPIDAPI_KEY as string,
        "x-rapidapi-host": "skiplagged1.p.rapidapi.com",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      flights?: Record<
        string,
        { flight?: { duration?: number }; price?: number; seats?: number } | undefined
      >;
    };
    const first = data.flights ? Object.values(data.flights)[0] : undefined;
    if (!first || typeof first.price !== "number") return null;
    const priceMinor =
      route.currency === "INR"
        ? Math.round(first.price * 83 * 100)
        : Math.round(first.price * 100);
    return {
      currentPriceMinor: priceMinor,
      seatsRemaining: typeof first.seats === "number" ? Math.min(9, Math.max(1, first.seats)) : undefined,
      source: "rapidapi",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
