import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionCookieName, verifySessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Generic auth callback landing route. OAuth-style providers (or the magic
 * link flow) redirect here; we route authenticated visitors to the dashboard
 * and everyone else back to login.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/dashboard";

  try {
    const store = await cookies();
    const userId = verifySessionCookie(store.get(sessionCookieName())?.value);
    if (userId) {
      return NextResponse.redirect(new URL(next, url), 303);
    }
  } catch {
    // fall through to login
  }
  return NextResponse.redirect(new URL("/login?error=callback", url), 303);
}
