"use client";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { CandlestickChart } from "@/components/Chart/CandlestickChart";
import { TimeframeSelector } from "@/components/Chart/TimeframeSelector";
import { OverlayToggle } from "@/components/Chart/OverlayToggle";
import { AuthButton } from "@/components/Auth/AuthButton";
import { AuthSync } from "@/components/Auth/AuthSync";
import { Watchlist } from "@/components/Watchlist/Watchlist";
import { SearchBar } from "@/components/Search/SearchBar";
import { MarketFilter } from "@/components/Search/MarketFilter";
import { PriceHeader } from "@/components/Detail/PriceHeader";
import { RightPanel } from "@/components/Detail/RightPanel";
import { useAppStore } from "@/store/useAppStore";
import { DEFAULT_SYMBOLS } from "@/lib/markets";
import type { Candle } from "@/lib/types";

export function AppShell() {
  const market = useAppStore((s) => s.market);
  const selected = useAppStore((s) => s.selected);
  const setSelected = useAppStore((s) => s.setSelected);
  const timeframe = useAppStore((s) => s.timeframe);
  const setTimeframe = useAppStore((s) => s.setTimeframe);
  const overlays = useAppStore((s) => s.overlays);
  const setOverlays = useAppStore((s) => s.setOverlays);

  // Auto-select default symbol when switching market and current selected isn't in that market.
  useEffect(() => {
    if (selected && selected.market === market) return;
    const fallback = DEFAULT_SYMBOLS[market][0];
    if (fallback) setSelected({ ...fallback, market });
  }, [market, selected, setSelected]);

  const { data: candles, isFetching } = useQuery({
    queryKey: ["candles", selected?.symbol, timeframe],
    queryFn: async () => {
      if (!selected) return [] as Candle[];
      const r = await fetch(
        `/api/candles?symbol=${encodeURIComponent(selected.symbol)}&tf=${timeframe}`,
      );
      if (!r.ok) return [];
      const j = (await r.json()) as { candles: Candle[] };
      return j.candles;
    },
    enabled: !!selected,
    staleTime: 30_000,
  });

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-1)]">
      <header className="h-12 flex items-center gap-3 px-4 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs">
            SV
          </div>
          <div className="text-sm font-semibold">Stock Vista</div>
        </div>
        <div className="ml-4">
          <MarketFilter />
        </div>
        <div className="flex-1 flex justify-center">
          <SearchBar />
        </div>
        <Link
          href="/compare"
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-2)]"
          title="종목 비교 차트"
        >
          <GitCompareArrows size={14} />
          비교
        </Link>
        <AuthButton />
        <AuthSync />
      </header>

      <div className="flex-1 grid grid-cols-[260px_1fr_340px] overflow-hidden">
        <aside className="border-r border-[var(--border)] overflow-hidden flex flex-col">
          <Watchlist />
        </aside>

        <main className="flex flex-col overflow-hidden">
          <PriceHeader />
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] gap-3">
            <TimeframeSelector value={timeframe} onChange={setTimeframe} />
            <OverlayToggle value={overlays} onChange={setOverlays} />
            <div className="text-[11px] text-[var(--text-secondary)] ml-auto">
              {selected?.symbol ?? ""} · {timeframe}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <CandlestickChart candles={candles ?? []} overlays={overlays} loading={isFetching} />
          </div>
        </main>

        <aside className="border-l border-[var(--border)] overflow-hidden">
          <RightPanel />
        </aside>
      </div>
    </div>
  );
}
