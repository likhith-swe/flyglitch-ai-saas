"use client";

import { useModals } from "./GlobalModals";
import { Countdown } from "./Countdown";
import { correctionDeadline } from "@/lib/fallback-routes";
import { formatDuration, formatMoney } from "@/lib/format";
import { goPath } from "@/lib/affiliate";
import type { FlightRoute } from "@/lib/types";

export function scoreTone(score: number): string {
  if (score >= 85) return "border-emerald-400/60 bg-emerald-500/10 text-emerald-300";
  if (score >= 70) return "border-amber-400/50 bg-amber-500/10 text-amber-300";
  return "border-slate-500/40 bg-slate-500/10 text-slate-300";
}

/** A single radar contact: live seats, countdown, score badge and claim CTA. */
export function RouteCard({ route }: { route: FlightRoute }) {
  const { openHistory, openWatchlist } = useModals();
  const deadline = correctionDeadline(route);
  const fuelDump =
    route.typicalFuelFeeMinor > 0 && route.fuelSurchargeMinor / route.typicalFuelFeeMinor < 0.1;

  return (
    <article className="group relative flex flex-col gap-4 rounded-xl border border-white/8 bg-[#0b0f16] p-5 transition hover:border-emerald-500/30 hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] tracking-widest text-slate-400">
            {route.airline.toUpperCase()} · <span className="text-slate-200">{route.flightNumber}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              {route.cabinClass.replace("_", " ")}
            </span>
            {fuelDump ? (
              <span className="rounded border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-emerald-300">
                YQ FUEL DUMP
              </span>
            ) : null}
            {route.isGlitch ? (
              <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-emerald-300">
                ⚡ GLITCH CONFIRMED
              </span>
            ) : (
              <span className="rounded border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-amber-300">
                ANOMALY WATCH
              </span>
            )}
          </div>
        </div>
        <div
          className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-center font-mono ${scoreTone(route.glitchScore)}`}
        >
          <div className="text-xl font-extrabold leading-none">⚡{Math.round(route.glitchScore)}</div>
          <div className="mt-0.5 text-[9px] tracking-[0.2em]">SCORE</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-mono text-3xl font-extrabold tracking-tight text-slate-100">
            {route.origin.code}
          </div>
          <div className="text-[11px] text-slate-500">{route.origin.city}</div>
        </div>
        <div className="flex flex-1 flex-col items-center px-2">
          <span className="text-sm text-emerald-400">✈</span>
          <span className="mt-1 h-px w-full bg-[repeating-linear-gradient(90deg,#334155_0_6px,transparent_6px_11px)]" />
          <span className="mt-1 font-mono text-[10px] text-slate-500">
            {route.stops === 0 ? "NONSTOP" : `1 STOP · ${route.layoverAirport}`}
          </span>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-extrabold tracking-tight text-slate-100">
            {route.destination.code}
          </div>
          <div className="text-[11px] text-slate-500">{route.destination.city}</div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {formatMoney(route.currentPriceMinor, route.currency)}
          </div>
          <div className="font-mono text-xs text-slate-500 line-through decoration-rose-400/60">
            {formatMoney(route.originalRetailMinor, route.currency)} retail
          </div>
        </div>
        <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-center font-mono text-sm font-bold text-amber-300">
          ▼{Math.round(route.discountPercent)}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-white/8 pt-3 font-mono text-[11px] text-slate-400">
        <div>
          <span className="text-slate-600">DUR </span>
          {formatDuration(route.durationMinutes)}
        </div>
        <div>
          <span className="text-slate-600">CHECKED </span>
          {route.lastCheckedAt
            ? `${new Date(route.lastCheckedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
            : "LIVE"}
        </div>
        <div className={route.seatsRemaining <= 4 ? "text-amber-400" : ""}>
          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${route.seatsRemaining <= 4 ? "animate-pulse bg-amber-400" : "bg-emerald-400"}`} />
          {route.seatsRemaining} SEATS LEFT
        </div>
        <div className="text-right">
          <span className="text-slate-600">CORRECTION </span>
          <Countdown deadline={deadline} />
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2">
        <button
          onClick={() => openHistory(route)}
          className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 font-mono text-xs text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
        >
          INSPECT 60-DAY HISTORY
        </button>
        <a
          href={goPath(route.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg bg-emerald-500 px-3 py-2.5 text-center font-mono text-xs font-bold text-[#04120c] transition hover:bg-emerald-400"
        >
          CLAIM GLITCH FARE ↗
        </a>
        <button
          onClick={() => openWatchlist(route)}
          title="Add to watchlist"
          aria-label="Add to watchlist"
          className="rounded-lg border border-white/10 px-3 py-2.5 text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300"
        >
          ＋
        </button>
      </div>
    </article>
  );
}
