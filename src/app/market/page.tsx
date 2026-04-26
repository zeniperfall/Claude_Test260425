"use client";
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MARKETS, DEFAULT_SYMBOLS } from "@/lib/markets";
import type { Market, Quote } from "@/lib/types";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

// Color scale for heat-map cells based on % change
function pctColor(pct: number): string {
  if (pct >= 5) return "bg-up/80 text-white";
  if (pct >= 2) return "bg-up/60 text-white";
  if (pct > 0) return "bg-up/30 text-up";
  if (pct === 0) return "bg-[var(--bg-2)] text-[var(--text-secondary)]";
  if (pct > -2) return "bg-down/30 text-down";
  if (pct > -5) return "bg-down/60 text-white";
  return "bg-down/80 text-white";
}

export default function MarketHeatmapPage() {
  const [market, setMarket] = useState<Market>("US");
  const symbols = DEFAULT_SYMBOLS[market];

  const queries = useQueries({
    queries: symbols.map((s) => ({
      queryKey: ["heatmap-quote", s.symbol],
      queryFn: async () => {
        const r = await fetch(`/api/quote?symbol=${encodeURIComponent(s.symbol)}`);
        if (!r.ok) return null;
        return (await r.json()) as Quote;
      },
      staleTime: 60_000,
      refetchInterval: 120_000,
    })),
  });

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-1)]">
      <header className="h-12 flex items-center gap-3 px-4 border-b border-[var(--border)]">
        <Link
          href="/"
          className="p-1 rounded hover:bg-[var(--bg-2)] text-[var(--text-secondary)] hover:text-white"
          aria-label="홈으로"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="text-sm font-semibold">시장 히트맵</div>
        <div className="ml-4 flex items-center gap-1 bg-[var(--bg-2)] border border-[var(--border)] rounded p-0.5">
          {MARKETS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMarket(m.key)}
              className={cn(
                "px-2.5 py-1 text-xs rounded",
                market === m.key
                  ? "bg-[var(--bg-3)] text-white"
                  : "text-[var(--text-secondary)] hover:text-white",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="ml-auto text-[11px] text-[var(--text-secondary)]">
          색상: 등락률 기반 (진한 녹색=강세, 진한 적색=약세)
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {symbols.map((s, i) => {
            const q = queries[i].data;
            const pct = q?.changePercent ?? 0;
            return (
              <Link
                key={s.symbol}
                href={`/stock/${encodeURIComponent(s.symbol)}`}
                className={cn(
                  "rounded p-3 transition-transform hover:scale-[1.02] flex flex-col gap-1",
                  q ? pctColor(pct) : "bg-[var(--bg-2)] text-[var(--text-secondary)]",
                )}
              >
                <div className="font-semibold text-sm truncate">{s.symbol}</div>
                <div className="text-[10px] truncate opacity-80">{s.name}</div>
                <div className="mt-auto flex items-end justify-between">
                  <span className="text-base font-semibold tabular-nums">
                    {q ? formatNumber(q.price) : "-"}
                  </span>
                  <span className="text-xs tabular-nums">
                    {q ? formatPercent(pct) : ""}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
