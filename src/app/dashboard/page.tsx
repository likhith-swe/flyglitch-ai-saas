"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useModals } from "@/components/GlobalModals";
import { Countdown } from "@/components/Countdown";
import { correctionDeadline } from "@/lib/fallback-routes";
import { formatMoney, formatMoneyCompact, timeAgo } from "@/lib/format";
import { goPath } from "@/lib/affiliate";
import type { CronAuditReport, FlightRoute, Watchlist } from "@/lib/types";

interface SessionUser {
  id: string;
  email: string;
  isPro: boolean;
  planTier: string;
}

/** Private ops console: session, tripwires, sweep controls and top contacts. */
export default function DashboardPage() {
  const { openPricing } = useModals();
  const [user, setUser] = useState<SessionUser | null | "loading">("loading");
  const [routes, setRoutes] = useState<FlightRoute[]>([]);
  const [source, setSource] = useState<string>("…");
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [report, setReport] = useState<CronAuditReport | null>(null);
  const [sweeping, setSweeping] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { authenticated: boolean; user: SessionUser | null }) => {
        if (!alive) return;
        if (d.authenticated && d.user) {
          setUser(d.user);
          fetch("/api/watchlists")
            .then((r) => r.json())
            .then((w: { watchlists?: Watchlist[] }) => alive && setWatchlists(w.watchlists ?? []))
            .catch(() => undefined);
        } else {
          setUser(null);
        }
      })
      .catch(() => alive && setUser(null));
    fetch("/api/routes")
      .then((r) => r.json())
      .then((d: { routes?: FlightRoute[]; source?: string }) => {
        if (!alive) return;
        setRoutes((d.routes ?? []).sort((a, b) => b.glitchScore - a.glitchScore));
        setSource(d.source ?? "fallback");
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const runSweep = useCallback(async () => {
    setSweeping(true);
    try {
      const res = await fetch("/api/cron/refresh-routes", { method: "POST" });
      const data = (await res.json()) as { report?: CronAuditReport };
      if (data.report) setReport(data.report);
    } catch {
      setReport(null);
    } finally {
      setSweeping(false);
    }
  }, []);

  if (user === "loading") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
        <span className="animate-pulse font-mono text-xs tracking-[0.3em] text-slate-500">
          AUTHENTICATING…
        </span>
      </main>
    );
  }

  if (user === null) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-4 text-xl font-extrabold text-slate-100">Control room is members-only</h1>
        <p className="mt-2 text-xs text-slate-400">
          Sign in with a magic link to arm tripwires, run sweeps and manage alerts.
        </p>
        <Link
          href="/login?next=/dashboard"
          className="mt-6 rounded-lg bg-emerald-500 px-8 py-3 font-mono text-xs font-bold text-[#04120c] hover:bg-emerald-400"
        >
          SIGN IN →
        </Link>
      </main>
    );
  }

  const glitches = routes.filter((r) => r.isGlitch);
  const avgDiscount = routes.length
    ? Math.round(routes.reduce((a, r) => a + r.discountPercent, 0) / routes.length)
    : 0;
  const top = routes.slice(0, 8);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-emerald-400">CONTROL ROOM</div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-100">
            Welcome back, <span className="font-mono text-emerald-300">{user.email}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2.5 py-1 font-mono text-[10px] font-bold ${
              user.isPro ? "bg-emerald-400 text-[#04120c]" : "bg-slate-700 text-slate-200"
            }`}
          >
            {user.isPro ? "CLUB PRO" : "FREE TIER"}
          </span>
          {!user.isPro ? (
            <button
              onClick={openPricing}
              className="rounded-lg border border-amber-400/50 px-3 py-1.5 font-mono text-[10px] font-bold text-amber-300 transition hover:bg-amber-500/10"
            >
              UPGRADE ₹499
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { k: "LIVE CONTACTS", v: String(routes.length), sub: `source: ${source}` },
          { k: "CONFIRMED GLITCHES", v: String(glitches.length), sub: "score ≥ 85 · ≥55% off" },
          { k: "AVG DISCOUNT", v: `${avgDiscount}%`, sub: "vs retail" },
          { k: "ACTIVE TRIPWIRES", v: String(watchlists.length), sub: user.isPro ? "unlimited slots" : "3 on free tier" },
        ].map((s) => (
          <div key={s.k} className="rounded-xl border border-white/8 bg-[#0b0f16] px-4 py-3.5">
            <div className="font-mono text-[9px] tracking-[0.2em] text-slate-500">{s.k}</div>
            <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-300">{s.v}</div>
            <div className="mt-0.5 font-mono text-[9px] text-slate-600">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Sweep console */}
      <section className="mt-8 rounded-xl border border-white/8 bg-[#0b0f16] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-mono text-sm font-bold text-slate-100">MANUAL SWEEP</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Re-scores every route, appends price samples and fires matching tripwires.
            </p>
          </div>
          <button
            onClick={runSweep}
            disabled={sweeping}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 font-mono text-xs font-bold text-[#04120c] transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {sweeping ? "SWEEPING…" : "RUN SWEEP NOW ⚡"}
          </button>
        </div>
        {report ? (
          <div className="mt-4 grid gap-2 rounded-lg border border-white/8 bg-[#07090e] p-4 font-mono text-[11px] text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              ROUTES <span className="text-emerald-300">{report.routesRefreshed}</span> / {report.routesScanned}
            </div>
            <div>
              SAMPLES <span className="text-emerald-300">{report.samplesAppended}</span>
            </div>
            <div>
              ALERTS <span className="text-amber-300">{report.alertsDispatched}</span> /{" "}
              {report.watchlistsEvaluated} tripwires
            </div>
            <div>
              PROVIDER <span className="text-slate-200">{report.provider}</span> · {report.durationMs}ms
            </div>
            {report.matches.map((m) => (
              <div key={m.watchlistId} className="text-amber-300/90 sm:col-span-2 lg:col-span-4">
                → {m.reason} · {m.channel} · {m.status} · {m.latencyMs}ms
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Top contacts */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold text-slate-100">HOTTEST CONTACTS</h2>
          <Link href="/watchlists" className="font-mono text-[11px] text-emerald-300 hover:underline">
            MANAGE TRIPWIRES →
          </Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/8 bg-[#0b0f16]">
          <table className="w-full min-w-[720px] text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/8 text-[9px] tracking-[0.2em] text-slate-500">
                <th className="px-4 py-3">SCORE</th>
                <th className="px-4 py-3">ROUTE</th>
                <th className="px-4 py-3">CARRIER</th>
                <th className="px-4 py-3">GLITCH PRICE</th>
                <th className="px-4 py-3">DROP</th>
                <th className="px-4 py-3">SEATS</th>
                <th className="px-4 py-3">CORRECTION</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {top.map((r) => (
                <tr key={r.id} className="border-b border-white/5 transition hover:bg-emerald-500/[0.04]">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 font-bold ${
                        r.isGlitch ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      ⚡{Math.round(r.glitchScore)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/flight/${r.id}`} className="font-bold text-slate-100 hover:text-emerald-300">
                      {r.origin.code}→{r.destination.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {r.airline} {r.flightNumber}
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-300">
                    {formatMoney(r.currentPriceMinor, r.currency)}
                    <span className="ml-2 text-slate-600 line-through">
                      {formatMoneyCompact(r.originalRetailMinor, r.currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-amber-300">−{Math.round(r.discountPercent)}%</td>
                  <td className={`px-4 py-3 ${r.seatsRemaining <= 4 ? "text-amber-400" : "text-slate-400"}`}>
                    {r.seatsRemaining}
                  </td>
                  <td className="px-4 py-3">
                    <Countdown deadline={correctionDeadline(r)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={goPath(r.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-emerald-500 px-2.5 py-1 font-bold text-[#04120c] hover:bg-emerald-400"
                    >
                      CLAIM ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tripwires */}
      <section className="mt-8">
        <h2 className="mb-3 font-mono text-sm font-bold text-slate-100">YOUR TRIPWIRES</h2>
        {watchlists.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#0b0f16] p-8 text-center">
            <p className="font-mono text-xs text-slate-500">
              No tripwires armed. Hit ＋ on any radar card or set one from the watchlists console.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {watchlists.map((w) => (
              <div key={w.id} className="rounded-xl border border-white/8 bg-[#0b0f16] p-4 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">
                    {w.originCode} → {w.destinationCode ?? "ANY"}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      w.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {w.isActive ? "ARMED" : "PAUSED"}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                  {w.maxPriceMinor !== null ? (
                    <div>PRICE ≤ {formatMoney(w.maxPriceMinor, "INR")}</div>
                  ) : null}
                  {w.minDiscountPercent !== null ? (
                    <div>DROP ≥ {Math.round(w.minDiscountPercent)}%</div>
                  ) : null}
                  <div>
                    VIA <span className="text-amber-300">{w.notifyChannel.toUpperCase()}</span>
                  </div>
                  <div className="text-slate-600">
                    armed {timeAgo(w.createdAt)}
                    {w.lastNotifiedAt ? ` · last ping ${timeAgo(w.lastNotifiedAt)}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
