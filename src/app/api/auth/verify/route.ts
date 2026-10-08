import { NextResponse } from "next/server";
import { consumeMagicToken, createSession, sessionCookieName, sessionTtlSeconds } from "@/lib/auth/session";
import { upsertProfileByEmail } from "@/lib/queries";
import { isProd } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Consume a single-use magic token, upsert the profile (Postgres or the
 * in-memory fallback store), mint the signed `fg_session` cookie and 303
 * redirect into the dashboard.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const email = consumeMagicToken(token);

  if (!email) {
    return NextResponse.redirect(new URL("/login?error=expired", url), 303);
  }

  const profile = await upsertProfileByEmail(email, "magic-link");
  const cookieValue = createSession(profile.id);

  const res = NextResponse.redirect(new URL("/dashboard", url), 303);
  res.cookies.set(sessionCookieName(), cookieValue, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: sessionTtlSeconds(),
  });
  return res;
}
