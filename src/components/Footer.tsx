"use client";

import Link from "next/link";
import { useModals } from "./GlobalModals";
import { DISCOUNT_BRACKETS, REGIONS } from "@/lib/types";
import { distinctPairs } from "@/lib/fallback-routes";

export function Footer() {
  const { openNewsletter } = useModals();
  const pairs = distinctPairs().slice(0, 10);

  return (
    <footer className="mt-20 border-t border-white/8 bg-[#090c13]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-sm text-[#04120c]">
              ⚡
            </span>
            <span className="font-mono text-sm font-extrabold tracking-[0.18em] text-slate-100">
              FLYGLITCH AI
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Institutional-grade fare anomaly radar. Currency mismatches, YQ/YR fuel dumps and OTA
            cache lag — scored 0–100, dispatched in 0 seconds.
          </p>
          <button
            onClick={openNewsletter}
            className="mt-4 rounded-lg border border-emerald-400/40 px-4 py-2 font-mono text-[11px] text-emerald-300 transition hover:bg-emerald-500/10"
          >
            WEEKLY DROP REPORT →
          </button>
        </div>

        <div>
          <h3 className="font-mono text-[10px] tracking-[0.25em] text-slate-500">REGIONAL RADARS</h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-400">
            {REGIONS.map((r) => (
              <li key={r.id}>
                <Link href={`/routes/${r.id}/60-percent-off`} className="transition hover:text-emerald-300">
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-mono text-[10px] tracking-[0.25em] text-slate-500">DEAL BRACKETS</h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-400">
            {DISCOUNT_BRACKETS.map((b) => (
              <li key={b.id}>
                <Link href={`/routes/asia/${b.id}`} className="transition hover:text-emerald-300">
                  {b.label}
                </Link>
              </li>
            ))}
            {pairs.slice(0, 2).map((p) => (
              <li key={`${p.origin}-${p.destination}`}>
                <Link
                  href={`/flights/${p.origin}/${p.destination}`}
                  className="transition hover:text-emerald-300"
                >
                  {p.origin} → {p.destination} fares
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-mono text-[10px] tracking-[0.25em] text-slate-500">TOP CORRIDORS</h3>
          <ul className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 font-mono text-[11px] text-slate-400">
            {pairs.map((p) => (
              <li key={`${p.origin}${p.destination}`}>
                <Link
                  href={`/flights/${p.origin}/${p.destination}`}
                  className="transition hover:text-emerald-300"
                >
                  {p.origin}→{p.destination}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 font-mono text-[10px] tracking-wider text-slate-600 sm:flex-row">
          <span>© {new Date().getFullYear()} FLYGLITCH AI · NOT AFFILIATED WITH ANY AIRLINE</span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            RADAR LIVE · 30 VERIFIED ROUTES · SWEEP 5 MIN
          </span>
          <span>FARES CHANGE IN MINUTES — BOOK AT YOUR OWN SPEED, NOT OURS</span>
        </div>
      </div>
    </footer>
  );
}
