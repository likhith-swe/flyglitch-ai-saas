import type { Metadata } from "next";
import { env } from "./env";
import { formatMoney } from "./format";
import type { FlightRoute } from "./types";

export const SITE_NAME = "FlyGlitch AI";
export const SITE_TAGLINE =
  "Institutional-grade flight price glitch, fuel-dump anomaly & mistake-fare arbitrage radar.";

export function absoluteUrl(path: string): string {
  const base = env.APP_URL.replace(/\/$/, "");
  return `${base}${path}`;
}

export function baseMetadata(opts: {
  title: string;
  description: string;
  path: string;
  route?: FlightRoute;
}): Metadata {
  const { title, description, path, route } = opts;
  const ogImage = route
    ? absoluteUrl(
        `/api/og?id=${encodeURIComponent(route.id)}&o=${encodeURIComponent(route.origin.code)}&d=${encodeURIComponent(route.destination.code)}&airline=${encodeURIComponent(route.airline)}&price=${encodeURIComponent(formatMoney(route.currentPriceMinor, route.currency))}&retail=${encodeURIComponent(formatMoney(route.originalRetailMinor, route.currency))}&score=${encodeURIComponent(String(Math.round(route.glitchScore)))}`
      )
    : absoluteUrl(
        `/api/og?o=BLR&d=DPS&airline=Glitch%20Radar&price=%E2%82%B98%2C490&retail=%E2%82%B929%2C500&score=92`
      );
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export function flightReservationJsonLd(route: FlightRoute): object {
  return {
    "@context": "https://schema.org",
    "@type": "FlightReservation",
    reservationId: `fg-${route.id}`,
    reservationStatus: "https://schema.org/ReservationHold",
    reservationFor: {
      "@type": "Flight",
      flightNumber: route.flightNumber.replace(/[^A-Za-z0-9]/g, ""),
      airline: { "@type": "Airline", name: route.airline, iataCode: route.airlineCode },
      departureAirport: { "@type": "Airport", name: route.origin.city, iataCode: route.origin.code },
      arrivalAirport: {
        "@type": "Airport",
        name: route.destination.city,
        iataCode: route.destination.code,
      },
    },
    price: (route.currentPriceMinor / 100).toFixed(2),
    priceCurrency: route.currency,
  };
}

export function productJsonLd(route: FlightRoute): object {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${route.origin.city} → ${route.destination.city} · ${route.airline} ${route.flightNumber}`,
    description: `${Math.round(route.discountPercent)}% off retail — Glitch Score ${Math.round(route.glitchScore)}/100. ${route.stops === 0 ? "Nonstop" : `1 stop via ${route.layoverAirport}`}, ${route.cabinClass.replace("_", " ")}.`,
    sku: route.id,
    brand: { "@type": "Brand", name: route.airline },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/flight/${route.id}`),
      priceCurrency: route.currency,
      price: (route.currentPriceMinor / 100).toFixed(2),
      availability:
        route.seatsRemaining > 0 ? "https://schema.org/LimitedAvailability" : "https://schema.org/SoldOut",
    },
  };
}

export function faqJsonLd(faqs: Array<{ q: string; a: string }>): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export const GLITCH_FAQS = [
  {
    q: "What is a flight price glitch?",
    a: "A fare anomaly caused by currency conversion mismatches, fuel surcharge (YQ/YR) omission across alliance legs, or OTA cache latency dumping seats at outdated fare buckets. Airlines typically correct them within 1–12 hours.",
  },
  {
    q: "How is the Glitch Score calculated?",
    a: "GlitchScore = 0.45×deviation from the 60-day median + 0.25×inventory drain velocity + 0.15×routing convenience + 0.15×fuel-dump signal, plus a +15 all-time-low bonus and a −20 excessive-layover penalty. Scores ≥85 with ≥55% off are classified as confirmed glitches.",
  },
  {
    q: "Will the airline honour a glitched fare?",
    a: "Most carriers honour ticketed itineraries even after correcting the fare, but un-ticketed holds can be cancelled. Book instantly, avoid changes for 24–72 hours, and never call the airline before ticketing.",
  },
  {
    q: "How fast are Club Pro alerts?",
    a: "Club Pro members receive 0-second WhatsApp or Telegram pings the moment our cron matches a watchlist. Free tier alerts are batched every 30 minutes over email.",
  },
];
