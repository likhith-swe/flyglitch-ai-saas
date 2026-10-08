"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { PriceChart } from "./PriceChart";
import { goPath } from "@/lib/affiliate";
import { formatMoney } from "@/lib/format";
import type { FlightRoute, PricePoint } from "@/lib/types";

interface HistoryResponse {
  ok: boolean;
  source?: string;
  points?: PricePoint[];
  stats?: {
    medianMinor: number;
    peakMinor: number;
    dropFromMedianPct: number;
  };
}

interface Props {
  route: FlightRoute;
  onClose: () => void;
}

/** 60-day fare inspection: SVG curve + drop stats + Glitch Score breakdown. */
export function PriceHistoryModal({ route, onClose }: Props) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/flight/${route.id}/history`)
      .then((r) => r.json())
      .then((d: HistoryResponse) => alive && setData(d))
      .catch(() => alive && setError("history fetch failed"));
    return () => {
      alive = false;
    };
  }, [route.id]);

  const parts = route.glitchScoreParts;
  const bars: Array<{ label: string; weight: string; raw: number; weighted: number }> = [
    { label: "S_deviation · median gap", weight: "45%", raw: parts.raw.deviation, weighted: parts.deviation },
    { label: "S_velocity · seat drain", weight: "25%", raw: parts.raw.velocity, weighted: parts.velocity },
    { label: "S_convenience · routing", weight: "15%", raw: parts.raw.convenience, weighted: parts.convenience },
    { label: "S_fuel · YQ/YR dump", weight: "15%", raw: parts.raw.fuel, weighted: parts.fuel },
  ];

  return (
    <Modal
      wide
      onClose={onClose}
      title={`${route.origin.code} → ${route.destination.code} — 60-day fare curve`}
      subtitle={`${route.airline} ${route.flightNumber} · ${route.cabinClass.replace("_", " ")} · source: ${data?.source ?? "loading"}`}
    >
      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-4 font-mono text-xs text-rose-300">
          {error}
        </div>
      ) : !data || !data.points ? (
        <div className="flex h-56 items-center justify-center font-mono text-xs text-slate-500">
          <span className="animate-pulse">RETRIEVING FARE TAPE…</span>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-white/8 bg-[#07090e] p-3">
            <PriceChart
              points={data.points}
              currency={route.currency}
              currentPriceMinor={route.currentPriceMinor}
              medianMinor={data.stats?.medianMinor ?? route.sixtyDayMedianMinor}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { k: "60D MEDIAN", v: formatMoney(data.stats?.medianMinor ?? route.sixtyDayMedianMinor, route.currency) },
              { k: "PEAK", v: formatMoney(data.stats?.peakMinor ?? route.originalRetailMinor, route.currency) },
              { k: "GLITCH PRICE", v: formatMoney(route.currentPriceMinor, route.currency), hot: true },
              { k: "DROP vs MEDIAN", v: `−${data.stats?.dropFromMedianPct ?? 0}%`, hot: true },
            ].map((c) => (
              <div key={c.k} className="rounded-lg border border-white/8 bg-[#0b0f16] px-3 py-2.5">
                <div className="font-mono text-[9px] tracking-[0.2em] text-slate-500">{c.k}</div>
                <div className={`mt-1 font-mono text-sm font-bold ${c.hot ? "text-emerald-300" : "text-slate-200"}`}>
                  {c.v}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-white/8 bg-[#0b0f16] p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[10px] tracking-[0.25em] text-slate-500">
                GLITCH SCORE DECOMPOSITION
              </h3>
              <span className="font-mono text-lg font-extrabold text-emerald-300">
                ⚡ {Math.round(parts.total)}<span className="text-xs text-slate-500">/100</span>
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              {bars.map((b) => (
                <div key={b.label}>
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>
                      {b.label} <span className="text-slate-600">w={b.weight}</span>
                    </span>
                    <span className="text-slate-300">
                      {b.raw.toFixed(0)} → +{b.weighted.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/5">
                    <div
                      className="h-full rounded bg-emerald-500/80"
                      style={{ width: `${Math.min(100, b.raw)}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-white/8 pt-2 font-mono text-[10px]">
                <span className="text-slate-400">B_floor (all-time low)</span>
                <span className={parts.floorBonus > 0 ? "text-emerald-300" : "text-slate-600"}>
                  {parts.floorBonus > 0 ? "+15" : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-slate-400">P_layover (2.5× duration)</span>
                <span className={parts.layoverPenalty > 0 ? "text-rose-300" : "text-slate-600"}>
                  {parts.layoverPenalty > 0 ? "−20" : "—"}
                </span>
              </div>
            </div>
          </div>

          <a
            href={goPath(route.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block rounded-lg bg-emerald-500 px-4 py-3 text-center font-mono text-sm font-bold text-[#04120c] transition hover:bg-emerald-400"
          >
            CLAIM AT {formatMoney(route.currentPriceMinor, route.currency)} ↗
          </a>
        </>
      )}
    </Modal>
  );
}
