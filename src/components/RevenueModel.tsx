const CHANNELS = [
  {
    n: "01",
    name: "Affiliate CPA — claim clicks",
    mechanism:
      "Every “Claim Glitch Fare” routes through /api/go/flight/[id], logging an anonymised click before 307-redirecting to Google Flights / Skyscanner / Kiwi partner links.",
    unit: "$0.40–$1.20 per qualified outbound",
    projection: "$6.2k / mo @ 180k clicks",
  },
  {
    n: "02",
    name: "Sponsored route placements",
    mechanism:
      "Carriers & OTAs bid for is_sponsored slots inside the radar grid. Auction clears at CPM, capped at 1 of 9 cards per viewport.",
    unit: "₹18 CPM · floor ₹9",
    projection: "$3.8k / mo @ 4.1M impressions",
  },
  {
    n: "03",
    name: "Club Pro subscriptions",
    mechanism:
      "₹499/mo via Razorpay (INR) or $9/mo via Stripe (global). Zero-second WhatsApp / Telegram dispatch, unlimited tripwires, priority sweep queue.",
    unit: "70% gross margin",
    projection: "$9.4k / mo @ 1,180 members",
  },
  {
    n: "04",
    name: "Newsletter sponsorships",
    mechanism:
      "The Weekly Drop Report carries one classified sponsor slot per issue, auctioned to travel fintechs and card issuers.",
    unit: "₹25k per issue slot",
    projection: "$1.2k / mo @ 4 issues",
  },
  {
    n: "05",
    name: "Fare-intelligence API licensing",
    mechanism:
      "The Glitch Score feed (route, score, decay ETA) licensed to OTAs and travel fintechs who want anomaly detection without running scrapers.",
    unit: "₹2 / 1,000 scored requests",
    projection: "$2.6k / mo @ 3 licensees",
  },
];

/** Transparent monetisation breakdown — the five revenue channels. */
export function RevenueModel() {
  return (
    <section id="revenue-model" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-emerald-400">
            FULL-STACK ARBITRAGE, FULLY DISCLOSED
          </div>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-100">
            How FlyGlitch makes money
          </h2>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#0b0f16] px-4 py-2 font-mono text-xs text-slate-300">
          BLENDED PROJECTION <span className="ml-2 font-bold text-emerald-300">$23.2k MRR</span>
        </div>
      </div>

      <div className="divide-y divide-white/8 overflow-hidden rounded-xl border border-white/8 bg-[#0b0f16]">
        {CHANNELS.map((c) => (
          <div key={c.n} className="grid gap-3 p-5 transition hover:bg-emerald-500/[0.03] md:grid-cols-[64px_1.2fr_1.6fr_auto]">
            <div className="font-mono text-2xl font-extrabold text-emerald-500/70">{c.n}</div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{c.name}</h3>
              <div className="mt-1 font-mono text-[10px] tracking-wider text-amber-300/90">{c.unit}</div>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">{c.mechanism}</p>
            <div className="font-mono text-xs font-bold text-emerald-300 md:text-right">{c.projection}</div>
          </div>
        ))}
      </div>

      <p className="mt-4 font-mono text-[10px] leading-relaxed text-slate-600">
        * Projections assume 1.4M monthly uniques, 4.2% click-through on radar cards and 0.85%
        free→Pro conversion — inline with fare-alert category benchmarks. Affiliate clicks are
        hashed; we never sell personal data.
      </p>
    </section>
  );
}
