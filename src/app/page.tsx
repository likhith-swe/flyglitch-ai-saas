import { Hero } from "@/components/Hero";
import { RouteTicker } from "@/components/RouteTicker";
import { RouteGrid } from "@/components/RouteGrid";
import { RevenueModel } from "@/components/RevenueModel";
import { ModalCta } from "@/components/OpenPricingCta";
import { listAllRoutes } from "@/lib/queries";
import { faqJsonLd, GLITCH_FAQS, SITE_TAGLINE } from "@/lib/seo";

export const revalidate = 300;

export default async function LandingPage() {
  const { routes } = await listAllRoutes();
  const sorted = [...routes].sort((a, b) => b.glitchScore - a.glitchScore);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(GLITCH_FAQS)) }}
      />
      <p className="sr-only">{SITE_TAGLINE}</p>

      <RouteTicker routes={routes} />
      <Hero routes={routes} />

      <main className="mx-auto max-w-7xl px-4">
        <section className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-emerald-400">
              LIVE SWEEP · G / Q / V FARE BUCKETS
            </div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-100">
              Radar contacts — sorted by Glitch Score
            </h2>
          </div>
          <ModalCta
            modal="watchlist"
            label="＋ ARM A NEW TRIPWIRE"
            className="rounded-lg border border-amber-400/40 px-4 py-2 font-mono text-[11px] text-amber-300 transition hover:bg-amber-500/10"
          />
        </section>

        <RouteGrid routes={sorted} />

        {/* Pricing comparison */}
        <section className="mt-20">
          <div className="mb-6 text-center">
            <div className="font-mono text-[10px] tracking-[0.3em] text-emerald-400">
              ZERO-SECOND DISPATCH
            </div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-100">
              Free radar vs Club Pro
            </h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#0b0f16] p-6">
              <div className="font-mono text-[10px] tracking-[0.25em] text-slate-500">FREE TIER</div>
              <div className="mt-2 text-3xl font-extrabold text-slate-100">₹0</div>
              <ul className="mt-5 space-y-2.5 text-sm text-slate-400">
                <li>▪ 30-minute batched email alerts</li>
                <li>▪ 3 active watchlists</li>
                <li>▪ Full 60-day price history</li>
                <li>▪ Glitch Score visibility</li>
              </ul>
              <ModalCta
                modal="watchlist"
                label="START FREE →"
                className="mt-6 w-full rounded-lg border border-white/15 px-4 py-2.5 font-mono text-xs text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-300"
              />
            </div>
            <div className="relative rounded-xl border border-emerald-400/50 bg-emerald-500/[0.06] p-6">
              <div className="absolute -top-3 left-6 rounded bg-emerald-500 px-2.5 py-1 font-mono text-[9px] font-bold tracking-wider text-[#04120c]">
                RECOMMENDED FOR ARBITRAGE
              </div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-emerald-400">CLUB PRO</div>
              <div className="mt-2 text-3xl font-extrabold text-emerald-300">
                ₹499<span className="text-base font-medium text-slate-400">/mo · $9 global</span>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
                <li>⚡ 0-second WhatsApp / Telegram pings</li>
                <li>⚡ Unlimited custom tripwires</li>
                <li>⚡ Priority sweep queue (≤60s)</li>
                <li>⚡ Fuel-dump & POS-error early access</li>
              </ul>
              <ModalCta
                modal="pricing"
                label="OPEN CHECKOUT ⚡"
                className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-mono text-xs font-bold text-[#04120c] transition hover:bg-emerald-400"
              />
            </div>
          </div>
        </section>

        <RevenueModel />

        {/* FAQ */}
        <section className="mx-auto max-w-3xl pb-10">
          <h2 className="mb-5 text-center text-2xl font-extrabold tracking-tight text-slate-100">
            Glitch radar, explained
          </h2>
          <div className="space-y-2">
            {GLITCH_FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-lg border border-white/8 bg-[#0b0f16] px-5 py-4 open:border-emerald-400/30"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-200">
                  {f.q}
                  <span className="font-mono text-emerald-400 transition group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-8 rounded-xl border border-white/10 bg-[#0b0f16] p-6 text-center">
            <div className="font-mono text-[10px] tracking-[0.3em] text-slate-500">
              FRIDAYS · 07:00 IST
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-100">The Weekly Drop Report</h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
              The 10 sharpest fare fractures of the week, straight to your inbox before the weekend
              inventory burns.
            </p>
            <ModalCta
              modal="newsletter"
              label="SUBSCRIBE FREE →"
              className="mt-4 rounded-lg bg-emerald-500 px-6 py-2.5 font-mono text-xs font-bold text-[#04120c] transition hover:bg-emerald-400"
            />
          </div>
        </section>
      </main>
    </>
  );
}


