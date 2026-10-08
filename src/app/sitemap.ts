import type { MetadataRoute } from "next";
import { FALLBACK_ROUTES, distinctPairs } from "@/lib/fallback-routes";
import { absoluteUrl } from "@/lib/seo";
import { DISCOUNT_BRACKETS, REGIONS } from "@/lib/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/login"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const pairEntries: MetadataRoute.Sitemap = distinctPairs().map((p) => ({
    url: absoluteUrl(`/flights/${p.origin}/${p.destination}`),
    lastModified: now,
    changeFrequency: "hourly",
    priority: 0.9,
  }));

  const regionEntries: MetadataRoute.Sitemap = REGIONS.flatMap((r) =>
    DISCOUNT_BRACKETS.map((b) => ({
      url: absoluteUrl(`/routes/${r.id}/${b.id}`),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    }))
  );

  const flightEntries: MetadataRoute.Sitemap = FALLBACK_ROUTES.map((r) => ({
    url: absoluteUrl(`/flight/${r.id}`),
    lastModified: now,
    changeFrequency: "hourly",
    priority: 0.85,
  }));

  return [...staticEntries, ...pairEntries, ...regionEntries, ...flightEntries];
}
