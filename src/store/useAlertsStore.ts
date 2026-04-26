"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AlertCondition = "above" | "below";

export interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  target: number;
  condition: AlertCondition;
  triggered: boolean;
  createdAt: number;
}

interface AlertsState {
  alerts: PriceAlert[];
  addAlert: (a: Omit<PriceAlert, "id" | "triggered" | "createdAt">) => void;
  removeAlert: (id: string) => void;
  markTriggered: (id: string) => void;
  resetAlert: (id: string) => void;
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      alerts: [],
      addAlert: (a) =>
        set({
          alerts: [
            ...get().alerts,
            {
              ...a,
              id: `${a.symbol}-${a.condition}-${a.target}-${Date.now()}`,
              triggered: false,
              createdAt: Date.now(),
            },
          ],
        }),
      removeAlert: (id) =>
        set({ alerts: get().alerts.filter((a) => a.id !== id) }),
      markTriggered: (id) =>
        set({
          alerts: get().alerts.map((a) =>
            a.id === id ? { ...a, triggered: true } : a,
          ),
        }),
      resetAlert: (id) =>
        set({
          alerts: get().alerts.map((a) =>
            a.id === id ? { ...a, triggered: false } : a,
          ),
        }),
    }),
    { name: "tv-stocks-alerts" },
  ),
);
