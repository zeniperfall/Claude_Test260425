"use client";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GitCompareArrows, BellRing, Menu, X, PanelRightOpen, PanelRightClose, Grid3x3 } from "lucide-react";
import { useAlertsStore } from "@/store/useAlertsStore";
import { CandlestickChart } from "@/components/Chart/CandlestickChart";
import { TimeframeSelector } from "@/components/Chart/TimeframeSelector";
import { OverlayToggle } from "@/components/Chart/OverlayToggle";
import { SubchartToggle } from "@/components/Chart/SubchartToggle";
import { AuthButton } from "@/components/Auth/AuthButton";
import { AuthSync } from "@/components/Auth/AuthSync";
import { Watchlist } from "@/components/Watchlist/Watchlist";
import { SearchBar } from "@/components/Search/SearchBar";
import { MarketFilter } from "@/components/Search/MarketFilter";
import { PriceHeader } from "@/components/Detail/PriceHeader";
import { RightPanel } from "@/components/Detail/RightPanel";
import { useAppStore } from "@/store/useAppStore";
import { DEFAULT_SYMBOLS, timeframeToRange } from "@/lib/markets";
import type { Candle } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AppShell() {
  const market = useAppStore((s) => s.market);
  const selected = useAppStore((s) => s.selected);
  const setSelected = useAppStore((s) => s.setSelected);
  const timeframe = useAppStore((s) => s.timeframe);
  const setTimeframe = useAppStore((s) => s.setTimeframe);
  const overlays = useAppStore((s) => s.overlays);
  const setOverlays = useAppStore((s) => s.setOverlays);
  const subcharts = useAppStore((s) => s.subcharts);
  const setSubcharts = useAppStore((s) => s.setSubcharts);
  const triggeredCount = useAlertsStore((s) =>
    s.alerts.filter((a) => a.triggered).length,
  );

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

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

  // Lazy-load older candles when the user scrolls past the leftmost bar.
  const handleLoadMore = useCallback(
    async (beforeTime: number): Promise<Candle[]> => {
      if (!selected) return [];
      const { interval } = timeframeToRange(timeframe);
      const params = new URLSearchParams({
        symbol: selected.symbol,
        before: String(beforeTime),
        interval,
      });
      const r = await fetch(`/api/candles/extend?${params}`);
      if (!r.ok) return [];
      const j = (await r.json()) as { candles: Candle[] };
      return j.candles;
    },
    [selected, timeframe],
  );

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-1)]">
      <header className="h-12 flex items-center gap-2 px-3 sm:px-4 border-b border-[var(--border)] flex-shrink-0">
        {/* Mobile: left drawer toggle */}
        <button
          onClick={() => setLeftOpen((v) => !v)}
          className="lg:hidden p-1 rounded hover:bg-[var(--bg-2)] text-[var(--text-secondary)]"
          aria-label="워치리스트 토글"
        >
          {leftOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs">
            SV
          </div>
          <div className="text-sm font-semibold hidden sm:block">Stock Vista</div>
        </div>
        <div className="ml-2 hidden sm:block">
          <MarketFilter />
        </div>
        <div className="flex-1 flex justify-center px-2">
          <SearchBar />
        </div>
        {triggeredCount > 0 && (
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-up/20 text-up text-[10px] font-semibold"
            title={`트리거된 알림 ${triggeredCount}개`}
          >
            <BellRing size={11} />
            {triggeredCount}
          </div>
        )}
        <Link
          href="/compare"
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-2)]"
          title="종목 비교 차트"
        >
          <GitCompareArrows size={14} />
          <span className="hidden md:inline">비교</span>
        </Link>
        <Link
          href="/market"
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-2)]"
          title="시장 히트맵"
        >
          <Grid3x3 size={14} />
          <span className="hidden md:inline">히트맵</span>
        </Link>
        <AuthButton />
        <AuthSync />

        {/* Mobile: right drawer toggle */}
        <button
          onClick={() => setRightOpen((v) => !v)}
          className="lg:hidden p-1 rounded hover:bg-[var(--bg-2)] text-[var(--text-secondary)]"
          aria-label="상세 패널 토글"
        >
          {rightOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </header>

      <div className="flex-1 relative lg:grid lg:grid-cols-[260px_1fr_340px] overflow-hidden">
        {/* Left sidebar: drawer on mobile, fixed column on desktop */}
        <aside
          className={cn(
            "border-r border-[var(--border)] overflow-hidden flex flex-col bg-[var(--bg-1)]",
            "lg:relative lg:translate-x-0",
            "absolute top-0 left-0 z-40 h-full w-[260px] transition-transform",
            leftOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          {/* Mobile-only market filter inside drawer */}
          <div className="sm:hidden p-2 border-b border-[var(--border)]">
            <MarketFilter />
          </div>
          <Watchlist />
        </aside>

        {/* Main area */}
        <main className="flex flex-col overflow-hidden">
          <PriceHeader />
          <div className="flex items-center px-3 sm:px-4 py-2 border-b border-[var(--border)] gap-3 overflow-x-auto">
            <TimeframeSelector value={timeframe} onChange={setTimeframe} />
            <span className="hidden sm:block w-px h-4 bg-[var(--border)]" />
            <OverlayToggle value={overlays} onChange={setOverlays} />
            <span className="hidden sm:block w-px h-4 bg-[var(--border)]" />
            <SubchartToggle value={subcharts} onChange={setSubcharts} />
            <div className="text-[11px] text-[var(--text-secondary)] ml-auto whitespace-nowrap">
              {selected?.symbol ?? ""} · {timeframe}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <CandlestickChart
              candles={candles ?? []}
              overlays={overlays}
              subcharts={subcharts}
              loading={isFetching}
              symbol={selected?.symbol}
              onLoadMore={handleLoadMore}
            />
          </div>
        </main>

        {/* Right panel: drawer on mobile, fixed column on desktop */}
        <aside
          className={cn(
            "border-l border-[var(--border)] overflow-hidden bg-[var(--bg-1)]",
            "lg:relative lg:translate-x-0",
            "absolute top-0 right-0 z-40 h-full w-[340px] transition-transform",
            rightOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          )}
        >
          <RightPanel />
        </aside>

        {/* Mobile drawer backdrop */}
        {(leftOpen || rightOpen) && (
          <button
            className="lg:hidden absolute inset-0 z-30 bg-black/40"
            onClick={() => {
              setLeftOpen(false);
              setRightOpen(false);
            }}
            aria-label="패널 닫기"
          />
        )}
      </div>
    </div>
  );
}
