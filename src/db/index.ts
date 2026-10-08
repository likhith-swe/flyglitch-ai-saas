import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Resilient database client.
 *
 * Defaults safely to a local connection string and carries a hard 3000ms
 * connection timeout so an offline / unprovisioned PostgreSQL can never hang
 * a request, a cron tick or `npm run build`. All call sites go through the
 * fallback-aware helpers in `src/lib/queries.ts`.
 */
export const databaseUrl =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/flyglitch";

const globalForDb = globalThis as typeof globalThis & {
  __fgPool?: Pool;
  __fgDb?: ReturnType<typeof drizzle<typeof schema>>;
  __fgDbDownUntil?: number;
  __fgDbUp?: boolean;
};

export const pool =
  globalForDb.__fgPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 3_000,
  });

export const db = globalForDb.__fgDb ?? drizzle(pool, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__fgPool = pool;
  globalForDb.__fgDb = db;
}

export type Db = typeof db;

/** How long (ms) to treat the database as offline after a failed probe. */
const NEGATIVE_CACHE_MS = 15_000;

export async function isDbAvailable(force = false): Promise<boolean> {
  const now = Date.now();
  if (!force) {
    if (globalForDb.__fgDbUp) return true;
    if (globalForDb.__fgDbDownUntil && globalForDb.__fgDbDownUntil > now) return false;
  }
  try {
    const client = await pool.connect();
    try {
      await client.query("select 1");
    } finally {
      client.release();
    }
    globalForDb.__fgDbUp = true;
    globalForDb.__fgDbDownUntil = undefined;
    return true;
  } catch {
    globalForDb.__fgDbUp = false;
    globalForDb.__fgDbDownUntil = now + NEGATIVE_CACHE_MS;
    return false;
  }
}

/**
 * Run a database operation with a hard wall-clock timeout and a typed
 * fallback value for when PostgreSQL is offline.
 */
export async function withDb<T>(
  op: (client: Db) => Promise<T>,
  fallback: T | (() => T),
  timeoutMs = 4_000
): Promise<T> {
  const available = await isDbAvailable();
  if (!available) return typeof fallback === "function" ? (fallback as () => T)() : fallback;
  try {
    return await Promise.race([
      op(db),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("db-op-timeout")), timeoutMs)
      ),
    ]);
  } catch {
    return typeof fallback === "function" ? (fallback as () => T)() : fallback;
  }
}
