"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Market } from "@/lib/types";

export interface Position {
  symbol: string;
  name: string;
  market: Market;
  quantity: number;
  avgCost: number; // in the instrument's native currency
  currency?: string;
  addedAt: number;
}

interface PortfolioState {
  positions: Position[];
  upsert: (p: Omit<Position, "addedAt"> & { addedAt?: number }) => void;
  remove: (symbol: string) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      positions: [],
      upsert: (p) => {
        const existing = get().positions.find((x) => x.symbol === p.symbol);
        if (existing) {
          set({
            positions: get().positions.map((x) =>
              x.symbol === p.symbol
                ? { ...x, quantity: p.quantity, avgCost: p.avgCost, name: p.name, market: p.market, currency: p.currency }
                : x,
            ),
          });
        } else {
          set({
            positions: [
              ...get().positions,
              { ...p, addedAt: p.addedAt ?? Date.now() },
            ],
          });
        }
      },
      remove: (symbol) =>
        set({ positions: get().positions.filter((x) => x.symbol !== symbol) }),
    }),
    { name: "tv-stocks-portfolio" },
  ),
);
