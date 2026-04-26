"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Market, Timeframe } from "@/lib/types";
import { DEFAULT_SYMBOLS } from "@/lib/markets";

export interface WatchlistItem {
  symbol: string;
  name: string;
  market: Market;
}

export interface OverlayPrefs {
  sma20?: boolean;
  sma50?: boolean;
  bollinger?: boolean;
}

interface AppState {
  market: Market;
  setMarket: (m: Market) => void;

  selected: WatchlistItem | null;
  setSelected: (s: WatchlistItem) => void;

  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;

  overlays: OverlayPrefs;
  setOverlays: (next: OverlayPrefs) => void;

  watchlist: WatchlistItem[];
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (symbol: string) => void;
  isWatched: (symbol: string) => boolean;
}

const defaultWatchlist: WatchlistItem[] = [
  ...DEFAULT_SYMBOLS.US.slice(0, 3).map((s) => ({ ...s, market: "US" as Market })),
  ...DEFAULT_SYMBOLS.KR.slice(0, 2).map((s) => ({ ...s, market: "KR" as Market })),
  ...DEFAULT_SYMBOLS.CN.slice(0, 2).map((s) => ({ ...s, market: "CN" as Market })),
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      market: "US",
      setMarket: (m) => set({ market: m }),

      selected: { ...DEFAULT_SYMBOLS.US[0], market: "US" },
      setSelected: (s) => set({ selected: s }),

      timeframe: "3M",
      setTimeframe: (tf) => set({ timeframe: tf }),

      overlays: { sma20: false, sma50: false, bollinger: false },
      setOverlays: (next) => set({ overlays: next }),

      watchlist: defaultWatchlist,
      addToWatchlist: (item) => {
        if (get().watchlist.some((w) => w.symbol === item.symbol)) return;
        set({ watchlist: [...get().watchlist, item] });
      },
      removeFromWatchlist: (symbol) =>
        set({ watchlist: get().watchlist.filter((w) => w.symbol !== symbol) }),
      isWatched: (symbol) => get().watchlist.some((w) => w.symbol === symbol),
    }),
    {
      name: "tv-stocks-app-state",
      partialize: (s) => ({
        watchlist: s.watchlist,
        selected: s.selected,
        market: s.market,
        timeframe: s.timeframe,
        overlays: s.overlays,
      }),
    },
  ),
);
