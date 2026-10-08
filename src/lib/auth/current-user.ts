import { cookies } from "next/headers";
import { sessionCookieName, verifySessionCookie } from "./session";
import { getProfileById } from "@/lib/queries";
import type { Profile } from "@/lib/types";

export interface CurrentUser {
  user: Profile;
  sessionUserId: string;
}

/**
 * Resolve the authenticated profile for a request from the `fg_session`
 * cookie. Returns null for anonymous visitors, expired cookies or unknown
 * user ids (including the in-memory fallback store).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const store = await cookies();
    const raw = store.get(sessionCookieName())?.value;
    const userId = verifySessionCookie(raw);
    if (!userId) return null;
    const profile = await getProfileById(userId);
    if (!profile) return null;
    return { user: profile, sessionUserId: userId };
  } catch {
    return null;
  }
}
