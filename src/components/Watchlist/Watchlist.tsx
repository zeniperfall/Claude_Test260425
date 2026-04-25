"use client";
import { useQueries } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { DEFAULT_SYMBOLS } from "@/lib/markets";
import type { Quote } from "@/lib/types";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

export function Watchlist() {
  const market = useAppStore((s) => s.market);
  const watchlist = useAppStore((s) => s.watchlist);
  const selected = useAppStore((s) => s.selected);
  const setSelected = useAppStore((s) => s.setSelected);
  const removeFromWatchlist = useAppStore((s) => s.removeFromWatchlist);
  const addToWatchlist = useAppStore((s) => s.addToWatchlist);

  const filtered = watchlist.filter((w) => w.market === market);

  const queries = useQueries({
    queries: filtered.map((item) => ({
      queryKey: ["quote", item.symbol],
      queryFn: async () => {
        const r = await fetch(`/api/quote?symbol=${encodeURIComponent(item.symbol)}`);
        if (!r.ok) return null;
        return (await r.json()) as Quote;
      },
      staleTime: 30_000,
      refetchInterval: 60_000,
    })),
  });

  const presets = DEFAULT_SYMBOLS[market]
    .filter((p) => !watchlist.some((w) => w.symbol === p.symbol))
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">워치리스트</div>
      </div>
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-xs text-[var(--text-secondary)]">
            이 시장에는 추가된 종목이 없습니다
          </div>
        )}
        {filtered.map((item, idx) => {
          const q = queries[idx]?.data;
          const isSelected = selected?.symbol === item.symbol;
          const isUp = q ? q.changePercent >= 0 : null;
          return (
            <div
              key={item.symbol}
              onClick={() => setSelected(item)}
              className={cn(
                "group flex items-center justify-between px-3 py-2 cursor-pointer border-b border-[var(--border)]",
                isSelected ? "bg-[var(--bg-3)]" : "hover:bg-[var(--bg-2)]",
              )}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{item.symbol}</span>
                <span className="text-[11px] text-[var(--text-secondary)] truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className="text-sm tabular-nums">
                    {q ? formatNumber(q.price) : "-"}
                  </div>
                  <div
                    className={cn(
                      "text-[11px] tabular-nums",
                      isUp === null ? "text-[var(--text-secondary)]" : isUp ? "text-up" : "text-down",
                    )}
                  >
                    {q ? formatPercent(q.changePercent) : ""}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWatchlist(item.symbol);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] hover:text-down transition-opacity"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {presets.length > 0 && (
        <div className="border-t border-[var(--border)] px-3 py-2">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase mb-1.5">추천 추가</div>
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <button
                key={p.symbol}
                onClick={() =>
                  addToWatchlist({ symbol: p.symbol, name: p.name, market })
                }
                className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg-2)] hover:bg-[var(--bg-3)] text-[var(--text-secondary)] hover:text-white"
              >
                + {p.symbol}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
