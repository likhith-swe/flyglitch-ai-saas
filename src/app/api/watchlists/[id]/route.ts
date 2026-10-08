import { getCurrentUser } from "@/lib/auth/current-user";
import { deleteWatchlist } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** Delete one of the caller's watchlists. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const current = await getCurrentUser();
  if (!current) {
    return Response.json({ ok: false, error: "auth_required" }, { status: 401 });
  }
  const { id } = await ctx.params;
  await deleteWatchlist(current.user.id, id);
  return Response.json({ ok: true, deleted: id });
}
