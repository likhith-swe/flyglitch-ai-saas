/**
 * Dependency-free sliding-window rate limiter backed by a global in-memory
 * Map. Used by auth, newsletter and checkout endpoints.
 */

interface WindowState {
  hits: number[];
}

const g = globalThis as typeof globalThis & {
  __fgRate?: Map<string, WindowState>;
};

const buckets: Map<string, WindowState> = (g.__fgRate ??= new Map());

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  let state = buckets.get(key);
  if (!state) {
    state = { hits: [] };
    buckets.set(key, state);
  }
  state.hits = state.hits.filter((t) => now - t < windowMs);
  if (state.hits.length >= limit) {
    const oldest = state.hits[0] ?? now;
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }
  state.hits.push(now);
  if (buckets.size > 20_000) {
    const first = buckets.keys().next().value;
    if (first !== undefined) buckets.delete(first);
  }
  return { ok: true, remaining: limit - state.hits.length, retryAfterSec: 0 };
}
