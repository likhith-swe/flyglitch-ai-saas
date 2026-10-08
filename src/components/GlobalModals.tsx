"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { FlightRoute } from "@/lib/types";
import { PriceHistoryModal } from "./PriceHistoryModal";
import { WatchlistModal } from "./WatchlistModal";
import { PricingModal } from "./PricingModal";
import { NewsletterModal } from "./NewsletterModal";

type ModalKind = "history" | "watchlist" | "pricing" | "newsletter" | null;

interface ModalState {
  kind: ModalKind;
  route: FlightRoute | null;
}

export interface ModalsApi {
  openHistory: (route: FlightRoute) => void;
  openWatchlist: (route: FlightRoute | null) => void;
  openPricing: () => void;
  openNewsletter: () => void;
  close: () => void;
}

const ModalsContext = createContext<ModalsApi | null>(null);

export function useModals(): ModalsApi {
  const ctx = useContext(ModalsContext);
  if (!ctx) throw new Error("useModals must be used inside <GlobalModals>");
  return ctx;
}

/** App-wide modal host. Wrap the layout tree once; call `useModals()` anywhere. */
export function GlobalModals({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>({ kind: null, route: null });

  const api = useMemo<ModalsApi>(
    () => ({
      openHistory: (route) => setState({ kind: "history", route }),
      openWatchlist: (route) => setState({ kind: "watchlist", route }),
      openPricing: () => setState({ kind: "pricing", route: null }),
      openNewsletter: () => setState({ kind: "newsletter", route: null }),
      close: () => setState({ kind: null, route: null }),
    }),
    []
  );

  return (
    <ModalsContext.Provider value={api}>
      {children}
      {state.kind === "history" && state.route ? (
        <PriceHistoryModal route={state.route} onClose={api.close} />
      ) : null}
      {state.kind === "watchlist" ? (
        <WatchlistModal route={state.route} onClose={api.close} />
      ) : null}
      {state.kind === "pricing" ? <PricingModal onClose={api.close} /> : null}
      {state.kind === "newsletter" ? <NewsletterModal onClose={api.close} /> : null}
    </ModalsContext.Provider>
  );
}
