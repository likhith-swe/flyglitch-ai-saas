/**
 * Global in-memory TTL cache. Survives hot reloads via globalThis and works
 * with zero external dependencies — the required fallback whenever Redis or
 * PostgreSQL are unavailable.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const g = globalThis as typeof globalThis & {
  __fgCache?: Map<string, Entry<unknown>>;
};

const store: Map<string, Entry<unknown>> = (g.__fgCache ??= new Map());

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  if (store.size > 1_000) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

/** Get-or-compute with TTL. */
export async function remember<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  cacheSet(key, value, ttlMs);
  return value;
}

export function cacheStats(): { size: number } {
  return { size: store.size };
}
