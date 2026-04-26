"use client";
import { useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { useAlertsStore } from "@/store/useAlertsStore";
import type { Quote } from "@/lib/types";

/**
 * Background watcher that polls quotes for every active alert and fires a
 * browser Notification when the threshold is crossed. Mounted once at the
 * app root.
 */
export function AlertsManager() {
  const alerts = useAlertsStore((s) => s.alerts);
  const markTriggered = useAlertsStore((s) => s.markTriggered);

  // Unique symbols among non-triggered alerts
  const symbols = Array.from(
    new Set(alerts.filter((a) => !a.triggered).map((a) => a.symbol)),
  );

  const queries = useQueries({
    queries: symbols.map((sym) => ({
      queryKey: ["alert-quote", sym],
      queryFn: async () => {
        const r = await fetch(`/api/quote?symbol=${encodeURIComponent(sym)}`);
        if (!r.ok) return null;
        return (await r.json()) as Quote;
      },
      refetchInterval: 30_000,
      staleTime: 15_000,
    })),
  });

  useEffect(() => {
    queries.forEach((q, i) => {
      const sym = symbols[i];
      const price = q.data?.price;
      if (price == null) return;

      alerts
        .filter((a) => !a.triggered && a.symbol === sym)
        .forEach((a) => {
          const hit =
            (a.condition === "above" && price >= a.target) ||
            (a.condition === "below" && price <= a.target);
          if (!hit) return;
          markTriggered(a.id);
          fireNotification(a.name || a.symbol, a.symbol, a.condition, a.target, price);
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.map((q) => q.data?.price).join(","), alerts]);

  return null;
}

function fireNotification(
  name: string,
  symbol: string,
  condition: "above" | "below",
  target: number,
  price: number,
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  const body = `${condition === "above" ? "▲" : "▼"} ${target.toLocaleString()} 조건 도달 — 현재가 ${price.toLocaleString()}`;
  const title = `${name} (${symbol})`;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else {
    // best-effort fallback
    try {
      console.warn("[alert]", title, body);
    } catch {
      // noop
    }
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}
