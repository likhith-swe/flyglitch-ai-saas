import { formatMoneyCompact } from "@/lib/format";
import type { FlightRoute } from "@/lib/types";

/** Top-of-page live glitch marquee (CSS animation, duplicated for looping). */
export function RouteTicker({ routes }: { routes: FlightRoute[] }) {
  const items = [...routes]
    .sort((a, b) => b.glitchScore - a.glitchScore)
    .slice(0, 14);
  if (items.length === 0) return null;

  const row = (keyPrefix: string) => (
    <div className="flex shrink-0 items-center" aria-hidden={keyPrefix === "b"}>
      {items.map((r) => (
        <a
          key={`${keyPrefix}-${r.id}`}
          href={`/flight/${r.id}`}
          className="group flex items-center gap-2 whitespace-nowrap px-6 font-mono text-[11px] tracking-wider"
        >
          <span className={r.isGlitch ? "text-emerald-400" : "text-amber-400"}>
            {r.isGlitch ? "⚡" : "◆"}
          </span>
          <span className="text-slate-200">
            {r.origin.code}→{r.destination.code}
          </span>
          <span className="text-emerald-300">
            {formatMoneyCompact(r.currentPriceMinor, r.currency)}
          </span>
          <span className="text-rose-400/90 line-through decoration-rose-400/60">
            {formatMoneyCompact(r.originalRetailMinor, r.currency)}
          </span>
          <span className="text-amber-300/90">−{Math.round(r.discountPercent)}%</span>
          <span className="text-slate-600 group-hover:text-slate-400">
            {Math.round(r.glitchScore)}/100
          </span>
        </a>
      ))}
    </div>
  );

  return (
    <div className="relative overflow-hidden border-y border-white/8 bg-[#090c13]">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#090c13] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#090c13] to-transparent" />
      <div className="flex w-max animate-[fgTicker_55s_linear_infinite] py-2 hover:[animation-play-state:paused]">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
