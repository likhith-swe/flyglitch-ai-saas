import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModalCta } from "@/components/OpenPricingCta";
import { RouteCard } from "@/components/RouteCard";
import { getRoutesByRegion } from "@/lib/queries";
import { baseMetadata, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { bracketMatches, DISCOUNT_BRACKETS, REGIONS } from "@/lib/types";

export const revalidate = 900;

interface Ctx {
  params: Promise<{ region: string; discount: string }>;
}

export function generateStaticParams() {
  return REGIONS.flatMap((r) => DISCOUNT_BRACKETS.map((b) => ({ region: r.id, discount: b.id })));
}

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { region, discount } = await params;
  const regionMeta = REGIONS.find((r) => r.id === region);
  const bracket = DISCOUNT_BRACKETS.find((b) => b.id === discount);
  if (!regionMeta || !bracket) return { title: "Radar sector not found" };
  return baseMetadata({
    title: `${regionMeta.label} flight deals — ${bracket.label}`,
    description: `Live flight price glitches and mistake fares in ${regionMeta.label}: ${bracket.label}. Scored 0–100 by the FlyGlitch engine, refreshed every 5 minutes.`,
    path: `/routes/${region}/${discount}`,
  });
}

export default async function RegionBracketPage({ params }: Ctx) {
  const { region, discount } = await params;
  const regionMeta = REGIONS.find((r) => r.id === region);
  const bracket = DISCOUNT_BRACKETS.find((b) => b.id === discount);
  if (!regionMeta || !bracket) notFound();

  const all = await getRoutesByRegion(region);
  const filtered = all
    .filter((r) => bracketMatches(bracket.id, r))
    .sort((a, b) => b.glitchScore - a.glitchScore);

  const faqs = [
    {
      q: `Which ${regionMeta.label} routes have ${bracket.label.toLowerCase()} fares right now?`,
      a:
        filtered.length > 0
          ? filtered
              .slice(0, 3)
              .map((r) => `${r.origin.code}→${r.destination.code} (${r.airline})`)
              .join(", ") + ` — ${filtered.length} total contacts on this sweep.`
          : `None at this instant. The sweep re-runs every 5 minutes; arm a tripwire to get pinged.`,
    },
    {
      q: `How fast do ${regionMeta.label} glitch fares get patched?`,
      a: "Most carrier revenue-management desks correct anomaly buckets within 1–12 hours; currency-mismatch fares usually survive longest because they depend on point-of-sale audits.",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            faqJsonLd(faqs),
            breadcrumbJsonLd([
              { name: "Radar", path: "/" },
              { name: regionMeta.label, path: `/routes/${region}/${bracket.id}` },
              { name: bracket.label, path: `/routes/${region}/${bracket.id}` },
            ]),
          ]),
        }}
      />

      <nav className="mb-5 font-mono text-[10px] tracking-wider text-slate-500">
        <Link href="/" className="hover:text-emerald-300">RADAR</Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-300">{regionMeta.label}</span>
        <span className="mx-1.5">/</span>
        <span className="text-emerald-300">{bracket.short}</span>
      </nav>

      <header className="mb-6 rounded-xl border border-white/8 bg-[#0b0f16] p-6">
        <div className="font-mono text-[10px] tracking-[0.3em] text-emerald-400">SECTOR SWEEP</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-100">
          {regionMeta.label} · <span className="text-emerald-400">{bracket.label}</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          {filtered.length > 0
            ? `${filtered.length} contact${filtered.length === 1 ? "" : "s"} currently clearing the ${bracket.label.toLowerCase()} filter. Every card carries a full 60-day fare tape and a Claim link routed through affiliate tracking.`
            : `No live contacts are clearing the ${bracket.label.toLowerCase()} filter right now. Brackets this sharp typically stay populated for minutes, not hours — arm a tripwire.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {DISCOUNT_BRACKETS.map((b) => (
            <Link
              key={b.id}
              href={`/routes/${region}/${b.id}`}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] transition ${
                b.id === bracket.id
                  ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 text-slate-400 hover:border-white/25"
              }`}
            >
              {b.short}
            </Link>
          ))}
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-[#0b0f16] p-12 text-center">
          <div className="text-4xl">📡</div>
          <h2 className="mt-3 font-mono text-sm font-bold text-slate-200">SECTOR CLEAR — FOR NOW</h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
            This bracket empties and fills throughout the day as carriers patch buckets. The cron
            sweep will catch the next drop.
          </p>
          <ModalCta
            modal="watchlist"
            label="＋ ARM A TRIPWIRE"
            className="mt-6 rounded-lg bg-emerald-500 px-6 py-2.5 font-mono text-xs font-bold text-[#04120c] hover:bg-emerald-400"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <RouteCard key={r.id} route={r} />
          ))}
        </div>
      )}

      <section className="mt-12">
        <h2 className="mb-4 font-mono text-xs font-bold tracking-[0.2em] text-slate-300">
          SWITCH SECTOR
        </h2>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <Link
              key={r.id}
              href={`/routes/${r.id}/${bracket.id}`}
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
