import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

/** Current session introspection for client components. */
export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return Response.json({ ok: true, authenticated: false, user: null });
  }
  return Response.json({
    ok: true,
    authenticated: true,
    user: {
      id: current.user.id,
      email: current.user.email,
      fullName: current.user.fullName,
      isPro: current.user.isPro,
      planTier: current.user.planTier,
    },
  });
}
