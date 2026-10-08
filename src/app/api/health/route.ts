import { isDbAvailable } from "@/db";
import { cacheStats } from "@/lib/cache";
import { authFeatureStatus, paymentsFeatureStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Platform health probe. Always returns 200 — an offline PostgreSQL simply
 * reports the resilient fallback mode instead of failing the check.
 */
export async function GET() {
  const dbUp = await isDbAvailable();
  return Response.json({
    ok: true,
    service: "flyglitch-ai",
    version: "1.0.0",
    database: dbUp ? "online" : "offline-fallback",
    catalog: dbUp ? "postgres+verified-30-route-fallback" : "verified-30-route-fallback",
    cache: cacheStats(),
    features: {
      ...paymentsFeatureStatus(),
      ...authFeatureStatus(),
    },
    time: new Date().toISOString(),
  });
}
