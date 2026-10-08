import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Countdown } from "@/components/Countdown";
import { ModalCta } from "@/components/OpenPricingCta";
import { PriceChart } from "@/components/PriceChart";
import { RouteCard } from "@/components/RouteCard";
import { FALLBACK_ROUTES, correctionDeadline } from "@/lib/fallback-routes";
import { formatDuration, formatMoney } from "@/lib/format";
import { goPath } from "@/lib/affiliate";
import { getPriceHistory, getRouteById, listAllRoutes } from "@/lib/queries";
import {
  baseMetadata,
  breadcrumbJsonLd,
  flightReservationJsonLd,
  productJsonLd,
} from "@/lib/seo";

export const revalidate = 600;

interface Ctx {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return FALLBACK_ROUTES.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { id } = await params;
  const route = await getRouteById(id);
  if (!route) return { title: "Route not found" };
  return baseMetadata({
    title: `${route.origin.city} → ${route.destination.city} at ${formatMoney(route.currentPriceMinor, route.currency)} — ${Math.round(route.discountPercent)}% off | ${route.airline} ${route.flightNumber}`,
    description: `${route.airline} ${route.flightNumber} from ${route.origin.city} (${route.origin.code}) to ${route.destination.city} (${route.destination.code}) is trading at ${formatMoney(route.currentPriceMinor, route.currency)} vs a ${formatMoney(route.sixtyDayMedianMinor, route.currency)} 60-day median. Glitch Score ${Math.round(route.glitchScore)}/100 · ${route.seatsRemaining} seats left.`,
    path: `/flight/${id}`,
    route,
  });
}

export default async function FlightDetailPage({ params }: Ctx) {
  const { id } = await params;
  const route = await getRouteById(id);
  if (!route) notFound();

  const [{ points }, { routes }] = await Promise.all([getPriceHistory(route), listAllRoutes()]);
  const related = routes
    .filter((r) => r.origin.code === route.origin.code && r.id !== route.id)
    .sort((a, b) => b.glitchScore - a.glitchScore)
    .slice(0, 3);

  const fuelRatio =
    route.typicalFuelFeeMinor > 0 ? route.fuelSurchargeMinor / route.typicalFuelFeeMinor : 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            flightReservationJsonLd(route),
            productJsonLd(route),
            breadcrumbJsonLd([
              { name: "Radar", path: "/" },
              { name: `${route.origin.code}→${route.destination.code}`, path: `/flight/${route.id}` },
            ]),
          ]),
        }}
      />

      <nav className="mb-5 font-mono text-[10px] tracking-wider text-slate-500">
        <Link href="/" className="hover:text-emerald-300">RADAR</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/flights/${route.origin.code}/${route.destination.code}`} className="hover:text-emerald-300">
          {route.origin.code}→{route.destination.code}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-300">{route.flightNumber}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <header className="rounded-xl border border-white/8 bg-[#0b0f16] p-6">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-wider">
              <span className="rounded border border-white/10 px-2 py-0.5 text-slate-300">
                {route.airline.toUpperCase()} · {route.flightNumber}
              </span>
              <span className="rounded border border-white/10 px-2 py-0.5 uppercase text-slate-400">
                {route.cabinClass.replace("_", " ")}
              </span>
              {route.isGlitch ? (
                <span className="rounded border border-emerald-400/50 bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-300">
                  ⚡ GLITCH CONFIRMED
                </span>
              ) : (
                <span className="rounded border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-amber-300">
                  ANOMALY WATCH
                </span>
              )}
              {fuelRatio < 0.1 ? (
                <span className="rounded border border-emerald-400/40 px-2 py-0.5 text-emerald-300">
                  YQ FUEL DUMP {Math.round(fuelRatio * 100)}% OF TYPICAL
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <div>
                  <div className="font-mono text-5xl font-extrabold tracking-tight text-slate-100">
                    {route.origin.code}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {route.origin.city}
                    {route.origin.terminal ? ` · ${route.origin.terminal}` : ""}
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-emerald-400">✈</span>
                  <span className="font-mono text-[10px] text-slate-500">{formatDuration(route.durationMinutes)}</span>
                  <span className="font-mono text-[10px] text-slate-600">
                    {route.stops === 0 ? "NONSTOP" : `via ${route.layoverAirport}`}
                  </span>
                </div>
                <div>
                  <div className="font-mono text-5xl font-extrabold tracking-tight text-slate-100">
                    {route.destination.code}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{route.destination.city}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-extrabold text-emerald-400">
                  {formatMoney(route.currentPriceMinor, route.currency)}
                </div>
                <div className="font-mono text-sm text-slate-500 line-through decoration-rose-400/60">
                  {formatMoney(route.originalRetailMinor, route.currency)} retail
                </div>
                <div className="mt-1 inline-block rounded border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                  ▼{Math.round(route.discountPercent)}% OFF
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
              <div className="font-mono text-[11px] text-slate-400">
                <span className="text-slate-600">EST. AIRLINE CORRECTION IN </span>
                <Countdown deadline={correctionDeadline(route)} className="text-sm font-bold" />
              </div>
              <div className={`font-mono text-[11px] ${route.seatsRemaining <= 4 ? "text-amber-400" : "text-slate-400"}`}>
                ◉ {route.seatsRemaining} SEATS LEFT IN LOWEST BUCKET
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={goPath(route.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-emerald-500 px-6 py-3 text-center font-mono text-sm font-bold text-[#04120c] transition hover:bg-emerald-400"
              >
                CLAIM GLITCH FARE ↗
              </a>
              <ModalCta
                modal="watchlist"
                label="＋ SET PRICE TRIPWIRE"
                className="rounded-lg border border-white/15 px-5 py-3 font-mono text-xs text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300"
              />
            </div>
          </header>

          <section className="mt-6 rounded-xl border border-white/8 bg-[#0b0f16] p-6">
            <h2 className="font-mono text-xs font-bold tracking-[0.2em] text-slate-300">
              60-DAY FARE TAPE
            </h2>
            <div className="mt-4 rounded-lg border border-white/8 bg-[#07090e] p-3">
              <PriceChart
                points={points}
                currency={route.currency}
                currentPriceMinor={route.currentPriceMinor}
                medianMinor={route.sixtyDayMedianMinor}
                height={260}
              />
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-white/8 bg-[#0b0f16] p-6">
            <h2 className="font-mono text-xs font-bold tracking-[0.2em] text-slate-300">
              GLITCH SCORE DECOMPOSITION — ⚡{Math.round(route.glitchScore)}/100
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { label: "S_deviation · gap vs 60-day median", weight: "45%", raw: route.glitchScoreParts.raw.deviation, out: route.glitchScoreParts.deviation },
                { label: "S_velocity · seat drain rate", weight: "25%", raw: route.glitchScoreParts.raw.velocity, out: route.glitchScoreParts.velocity },
                { label: "S_convenience · routing quality", weight: "15%", raw: route.glitchScoreParts.raw.convenience, out: route.glitchScoreParts.convenience },
                { label: "S_fuel · YQ/YR dump signal", weight: "15%", raw: route.glitchScoreParts.raw.fuel, out: route.glitchScoreParts.fuel },
              ].map((b) => (
                <div key={b.label} className="rounded-lg border border-white/8 bg-[#07090e] p-3">
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>{b.label} <span className="text-slate-600">w={b.weight}</span></span>
                    <span className="text-emerald-300">+{b.out.toFixed(1)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded bg-white/5">
                    <div className="h-full bg-emerald-500/80" style={{ width: `${Math.min(100, b.raw)}%` }} />
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-white/8 bg-[#07090e] p-3 font-mono text-[10px] text-slate-400">
                B_floor all-time-low bonus:{" "}
                <span className={route.glitchScoreParts.floorBonus ? "text-emerald-300" : "text-slate-600"}>
                  {route.glitchScoreParts.floorBonus ? "+15" : "—"}
                </span>
              </div>
              <div className="rounded-lg border border-white/8 bg-[#07090e] p-3 font-mono text-[10px] text-slate-400">
                P_layover 2.5× duration penalty:{" "}
                <span className={route.glitchScoreParts.layoverPenalty ? "text-rose-300" : "text-slate-600"}>
                  {route.glitchScoreParts.layoverPenalty ? "−20" : "—"}
                </span>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-white/8 bg-[#0b0f16] p-5">
            <h3 className="font-mono text-[10px] tracking-[0.25em] text-slate-500">FLIGHT SPECS</h3>
            <dl className="mt-3 space-y-2.5 font-mono text-xs">
              {[
                ["Carrier", `${route.airline} (${route.airlineCode})`],
                ["Flight", route.flightNumber],
                ["Cabin", route.cabinClass.replace("_", " ")],
                ["Stops", route.stops === 0 ? "Nonstop" : `1 × ${route.layoverAirport} (${route.layoverMinutes}m)`],
                ["Duration", formatDuration(route.durationMinutes)],
                ["60-day median", formatMoney(route.sixtyDayMedianMinor, route.currency)],
                ["All-time low", formatMoney(route.lowestEverMinor, route.currency)],
                ["Fuel surcharge", `${formatMoney(route.fuelSurchargeMinor, route.currency)} of ${formatMoney(route.typicalFuelFeeMinor, route.currency)} typical`],
                ["Region", route.region.replace("-", " ")],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right text-slate-200">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-amber-400/25 bg-amber-500/[0.06] p-5">
            <h3 className="font-mono text-[10px] tracking-[0.25em] text-amber-300">PLAYBOOK</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-[11px] leading-relaxed text-slate-400">
              <li>Book instantly through the claim link — glitch windows close in 1–12h.</li>
              <li>Do not call the airline before ticketing; phone agents reprice manually.</li>
              <li>Avoid itinerary changes for 72 hours post-ticketing.</li>
              <li>Screenshot the fare breakdown for honour-dispute leverage.</li>
            </ol>
          </div>

          {related.length > 0 ? (
            <div>
              <h3 className="mb-3 font-mono text-[10px] tracking-[0.25em] text-slate-500">
                MORE FROM {route.origin.code}
              </h3>
              <div className="space-y-4">
                {related.map((r) => (
                  <RouteCard key={r.id} route={r} />
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
