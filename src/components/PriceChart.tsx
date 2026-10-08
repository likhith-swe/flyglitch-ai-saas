import { formatMoneyCompact, formatDayShort } from "@/lib/format";
import type { Currency, PricePoint } from "@/lib/types";

interface PriceChartProps {
  points: PricePoint[];
  currency: Currency;
  height?: number;
  currentPriceMinor: number;
  medianMinor: number;
}

const W = 680;
const PAD_X = 46;
const PAD_TOP = 18;
const PAD_BOTTOM = 30;

/** Pure-SVG 60-day fare curve with gridlines, median band and crash marker. */
export function PriceChart({ points, currency, height = 240, currentPriceMinor, medianMinor }: PriceChartProps) {
  const H = height;
  if (points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center font-mono text-xs text-slate-500">
        INSUFFICIENT SAMPLES
      </div>
    );
  }

  const prices = points.map((p) => p.priceMinor);
  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const span = Math.max(1, rawMax - rawMin);
  const min = rawMin - span * 0.08;
  const max = rawMax + span * 0.08;

  const x = (i: number) => PAD_X + (i * (W - PAD_X - 14)) / (points.length - 1);
  const y = (v: number) => PAD_TOP + (1 - (v - min) / (max - min)) * (H - PAD_TOP - PAD_BOTTOM);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.priceMinor).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PAD_BOTTOM} L${x(0).toFixed(1)},${H - PAD_BOTTOM} Z`;

  const gridLevels = [0.15, 0.4, 0.65, 0.9].map((t) => min + t * (max - min));
  const tickIdx = [0, Math.floor(points.length / 3), Math.floor((2 * points.length) / 3), points.length - 1];
  const lastX = x(points.length - 1);
  const lastY = y(currentPriceMinor);
  const medianY = y(medianMinor);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="60 day price history">
      <defs>
        <linearGradient id="fgArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLevels.map((v, i) => (
        <g key={i}>
          <line x1={PAD_X} x2={W - 14} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" />
          <text x={PAD_X - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#64748b" fontFamily="monospace">
            {formatMoneyCompact(Math.round(v), currency)}
          </text>
        </g>
      ))}

      {/* 60-day median band */}
      <line x1={PAD_X} x2={W - 14} y1={medianY} y2={medianY} stroke="#f59e0b" strokeOpacity="0.45" strokeDasharray="6 4" />
      <text x={W - 16} y={medianY - 4} textAnchor="end" fontSize="9" fill="#f59e0b" fontFamily="monospace">
        60D MEDIAN {formatMoneyCompact(medianMinor, currency)}
      </text>

      <path d={area} fill="url(#fgArea)" />
      <path d={line} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />

      {/* crash marker */}
      <circle cx={lastX} cy={lastY} r="5" fill="#10b981" />
      <circle cx={lastX} cy={lastY} r="9" fill="none" stroke="#10b981" strokeOpacity="0.4" />
      <text x={lastX - 8} y={lastY + 16} textAnchor="end" fontSize="10" fontWeight="700" fill="#10b981" fontFamily="monospace">
        {formatMoneyCompact(currentPriceMinor, currency)} GLITCH
      </text>

      {tickIdx.map((idx) => (
        <text key={idx} x={x(idx)} y={H - 10} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">
          {formatDayShort(points[idx].date)}
        </text>
      ))}
    </svg>
  );
}
