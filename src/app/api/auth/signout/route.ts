import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Clear the session cookie and bounce back to the landing page. */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const res = NextResponse.redirect(new URL("/", url), 303);
  res.cookies.set(sessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
