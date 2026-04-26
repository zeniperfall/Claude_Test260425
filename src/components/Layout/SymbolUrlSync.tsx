"use client";
import { useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { inferMarketFromSymbol, DEFAULT_SYMBOLS } from "@/lib/markets";

/**
 * Two-way sync between the selected symbol in the store and the URL.
 * - On `/stock/[symbol]`, read the param and update the store.
 * - When the store's selection changes, push the new URL with `router.replace`.
 */
export function SymbolUrlSync() {
  const params = useParams<{ symbol?: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const selected = useAppStore((s) => s.selected);
  const setSelected = useAppStore((s) => s.setSelected);
  const setMarket = useAppStore((s) => s.setMarket);

  // URL → store (runs on initial load and on URL navigations)
  useEffect(() => {
    const raw = params?.symbol;
    if (!raw) return;
    const symbol = decodeURIComponent(raw);
    if (selected?.symbol === symbol) return;
    const market = inferMarketFromSymbol(symbol);
    const preset =
      DEFAULT_SYMBOLS[market].find((p) => p.symbol === symbol) ?? null;
    setSelected({
      symbol,
      name: preset?.name ?? symbol,
      market,
    });
    setMarket(market);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.symbol]);

  // store → URL (runs whenever the user picks a different symbol)
  useEffect(() => {
    if (!selected) return;
    const target = `/stock/${encodeURIComponent(selected.symbol)}`;
    if (pathname === target) return;
    // Only auto-redirect from root, not from comparison/other future pages.
    if (pathname === "/" || pathname?.startsWith("/stock/")) {
      router.replace(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.symbol]);

  return null;
}
