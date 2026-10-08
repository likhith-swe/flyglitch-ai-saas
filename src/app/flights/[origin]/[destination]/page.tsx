import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModalCta } from "@/components/OpenPricingCta";
import { RouteCard } from "@/components/RouteCard";
import { distinctPairs } from "@/lib/fallback-routes";
import { formatMoney } from "@/lib/format";
import { getRoutesForPair } from "@/lib/queries";
import { baseMetadata, breadcrumbJsonLd, faqJsonLd, GLITCH_FAQS } from "@/lib/seo";
import { REGIONS } from "@/lib/types";

export const revalidate = 900;

interface Ctx {
  params: Promise<{ origin: string; destination: string }>;
}

export function generateStaticParams() {
  return distinctPairs().map((p) => ({ origin: p.origin, destination: p.destination }));
}

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { origin, destination } = await params;
  const routes = await getRoutesForPair(origin, destination);
  const o = origin.toUpperCase();
  const d = destination.toUpperCase();
  if (routes.length === 0) {
    return baseMetadata({
      title: `${o} → ${d} flights — set a glitch alert`,
      description: `No live fare anomalies on ${o} → ${d} right now. Arm a tripwire and get pinged the moment a glitch lands.`,
      path: `/flights/${o}/${d}`,
    });
  }
  const best = [...routes].sort((a, b) => b.glitchScore - a.glitchScore)[0];
  return baseMetadata({
    title: `${o} → ${d} glitch fares from ${formatMoney(best.currentPriceMinor, best.currency)} (${Math.round(best.discountPercent)}% off)`,
    description: `${routes.length} live fare anomal${routes.length === 1 ? "y" : "ies"} on ${o} → ${d}. Best: ${best.airline} ${best.flightNumber} at ${formatMoney(best.currentPriceMinor, best.currency)}, Glitch Score ${Math.round(best.glitchScore)}/100.`,
    path: `/flights/${o}/${d}`,
    route: best,
  });
}

export default async function PairPage({ params }: Ctx) {
  const { origin, destination } = await params;
  const o = origin.toUpperCase();
  const d = destination.toUpperCase();
  if (!/^[A-Z]{3}$/.test(o) || !/^[A-Z]{3}$/.test(d)) notFound();

  const routes = (await getRoutesForPair(o, d)).sort((a, b) => b.glitchScore - a.glitchScore);

  const pairFaqs = [
    {
      q: `Are there glitch fares from ${o} to ${d} right now?`,
      a:
        routes.length > 0
          ? `Yes — ${routes.length} live anomal${routes.length === 1 ? "y" : "ies"}, best Glitch Score ${Math.round(routes[0].glitchScore)}/100 at ${formatMoney(routes[0].currentPriceMinor, routes[0].currency)}.`
          : `Not at this moment. Arm a tripwire and the 5-minute sweep will ping you when ${o}→${d} cracks.`,
    },
    ...GLITCH_FAQS.slice(0, 2),
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            faqJsonLd(pairFaqs),
            breadcrumbJsonLd([
              { name: "Radar", path: "/" },
              { name: `${o}→${d}`, path: `/flights/${o}/${d}` },
            ]),
          ]),
        }}
      />

      <nav className="mb-5 font-mono text-[10px] tracking-wider text-slate-500">
        <Link href="/" className="hover:text-emerald-300">RADAR</Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-300">{o}→{d}</span>
      </nav>

      <header className="mb-8 rounded-xl border border-white/8 bg-[#0b0f16] p-6">
        <div className="font-mono text-[10px] tracking-[0.3em] text-emerald-400">CORRIDOR SWEEP</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-100">
          <span className="font-mono">{o}</span> <span className="text-emerald-400">✈</span>{" "}
          <span className="font-mono">{d}</span> — live glitch fares
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          {routes.length > 0
            ? `${routes.length} fare anomal${routes.length === 1 ? "y" : "ies"} currently trading below the 60-day median on this corridor. Scores refresh on every sweep; confirmed glitches carry a ≥85 score with ≥55% off retail.`
            : `The sweep found no live anomalies on ${o} → ${d} right now — fares here are trading near median. Arm a tripwire below and the cron pipeline will ping you within 60 seconds of a crack.`}
        </p>
      </header>

      {routes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-[#0b0f16] p-12 text-center">
          <div className="text-4xl">📡</div>
          <h2 className="mt-3 font-mono text-sm font-bold text-slate-200">NO CONTACTS ON THIS CORRIDOR</h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
            Glitches are rare by definition — that&apos;s the arbitrage. Set the tripwire and stop
            refreshing manually.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <ModalCta
              modal="watchlist"
              label="＋ ARM A TRIPWIRE"
              className="rounded-lg bg-emerald-500 px-6 py-2.5 font-mono text-xs font-bold text-[#04120c] hover:bg-emerald-400"
            />
            <Link
              href="/"
              className="rounded-lg border border-white/15 px-6 py-2.5 font-mono text-xs text-slate-300 hover:border-emerald-400/40"
            >
              FULL RADAR →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {routes.map((r) => (
            <RouteCard key={r.id} route={r} />
          ))}
        </div>
      )}

      <section className="mt-12">
        <h2 className="mb-4 font-mono text-xs font-bold tracking-[0.2em] text-slate-300">
          OTHER REGIONAL RADARS
        </h2>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <Link
              key={r.id}
              href={`/routes/${r.id}/60-percent-off`}
              className="rounded-lg border border-white/10 px-4 py-2 font-mono text-[11px] text-slate-400 transition hover:border-emerald-400/40 hover:text-emerald-300"
            >
              {r.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
