import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

/**
 * Session + magic-link token engine.
 *
 * Postgres-independent by design: tokens and sessions live in global
 * in-memory Maps so login works even when the database is offline. Sessions
 * are additionally carried as HMAC-signed stateless cookies, which means a
 * server restart cannot invalidate an authenticated browser.
 */

const COOKIE_NAME = "fg_session";
const MAGIC_TTL_MS = 15 * 60 * 1000; // 15 minutes, single-use
const SESSION_TTL_MS = 30 * 24 * 3_600_000; // 30 days

interface MagicToken {
  email: string;
  expiresAt: number;
}

interface SessionRecord {
  userId: string;
  createdAt: number;
}

const g = globalThis as typeof globalThis & {
  __fgTokens?: Map<string, MagicToken>;
  __fgSessions?: Map<string, SessionRecord>;
};

const tokenStore: Map<string, MagicToken> = (g.__fgTokens ??= new Map());
const sessionStore: Map<string, SessionRecord> = (g.__fgSessions ??= new Map());

function secret(): string {
  return env.SESSION_SECRET || "flyglitch-dev-session-secret-do-not-use-in-prod";
}

export function sessionCookieName(): string {
  return COOKIE_NAME;
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function pruneTokens(): void {
  if (tokenStore.size < 5_000) return;
  const now = Date.now();
  for (const [k, v] of tokenStore) if (v.expiresAt <= now) tokenStore.delete(k);
}

/** Issue a single-use 15-minute magic token for an email address. */
export function createMagicToken(email: string): { token: string; expiresAt: number } {
  pruneTokens();
  const token = randomBytes(24).toString("base64url");
  const expiresAt = Date.now() + MAGIC_TTL_MS;
  tokenStore.set(token, { email: email.toLowerCase().trim(), expiresAt });
  return { token, expiresAt };
}

/** Consume a magic token. Returns the email exactly once, then null. */
export function consumeMagicToken(token: string): string | null {
  const rec = tokenStore.get(token);
  if (!rec) return null;
  tokenStore.delete(token);
  if (rec.expiresAt <= Date.now()) return null;
  return rec.email;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

interface SessionPayload {
  uid: string;
  iat: number;
  exp: number;
}

/** Create a signed session for a user id; returns the raw cookie value. */
export function createSession(userId: string): string {
  const iat = Date.now();
  const payload: SessionPayload = { uid: userId, iat, exp: iat + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(body);
  sessionStore.set(userId, { userId, createdAt: iat });
  if (sessionStore.size > 10_000) {
    const first = sessionStore.keys().next().value;
    if (first !== undefined) sessionStore.delete(first);
  }
  return `${body}.${sig}`;
}

/** Verify a raw cookie value; returns the user id or null. */
export function verifySessionCookie(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.uid || typeof payload.exp !== "number") return null;
    if (payload.exp <= Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

export function sessionTtlSeconds(): number {
  return Math.floor(SESSION_TTL_MS / 1000);
}

/** Privacy-preserving hash of a client IP for affiliate analytics. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${ip}::${secret()}`).digest("hex").slice(0, 24);
}
