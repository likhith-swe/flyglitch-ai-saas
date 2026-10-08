import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { GlobalModals } from "@/components/GlobalModals";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SmoothScroll } from "@/components/SmoothScroll";
import { SITE_TAGLINE, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: "FlyGlitch AI — Flight Price Glitch & Mistake Fare Radar",
    template: "%s · FlyGlitch AI",
  },
  description: SITE_TAGLINE,
  keywords: [
    "flight glitch",
    "mistake fares",
    "cheap flights India",
    "fuel dump",
    "fare arbitrage",
    "flight deals BLR",
    "flight deals DEL",
    "flight deals BOM",
  ],
  openGraph: {
    siteName: "FlyGlitch AI",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07090e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%2310b981'/%3E%3Ctext x='50' y='72' font-size='60' text-anchor='middle'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E"
        />
      </head>
      <body className="min-h-screen bg-[#07090e] text-slate-200 antialiased">
        <SmoothScroll />
        <GlobalModals>
          <Navigation />
          {children}
          <Footer />
        </GlobalModals>
      </body>
    </html>
  );
}
