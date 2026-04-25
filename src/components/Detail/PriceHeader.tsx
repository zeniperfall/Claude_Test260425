"use client";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import type { Quote } from "@/lib/types";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

export function PriceHeader() {
  const selected = useAppStore((s) => s.selected);
  const isWatched = useAppStore((s) => s.isWatched);
  const addToWatchlist = useAppStore((s) => s.addToWatchlist);
  const removeFromWatchlist = useAppStore((s) => s.removeFromWatchlist);

  const { data } = useQuery({
    queryKey: ["quote", selected?.symbol],
    queryFn: async () => {
      if (!selected) return null;
      const r = await fetch(`/api/quote?symbol=${encodeURIComponent(selected.symbol)}`);
      if (!r.ok) return null;
      return (await r.json()) as Quote;
    },
    enabled: !!selected,
    refetchInterval: 60_000,
  });

  if (!selected) return null;
  const watched = isWatched(selected.symbol);
  const isUp = data ? data.changePercent >= 0 : null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (watched) removeFromWatchlist(selected.symbol);
            else addToWatchlist(selected);
          }}
          className={cn(
            "p-1 rounded hover:bg-[var(--bg-2)]",
            watched ? "text-yellow-400" : "text-[var(--text-secondary)]",
          )}
          aria-label="watchlist toggle"
        >
          <Star size={16} fill={watched ? "currentColor" : "none"} />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">{selected.symbol}</span>
            <span className="text-xs text-[var(--text-secondary)]">{data?.name ?? selected.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-2)] text-[var(--text-secondary)]">
              {selected.market}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums">
            {data ? formatNumber(data.price) : "-"}
            {data?.currency && (
              <span className="text-xs text-[var(--text-secondary)] ml-1.5">{data.currency}</span>
            )}
          </div>
          <div
            className={cn(
              "text-xs tabular-nums",
              isUp === null ? "text-[var(--text-secondary)]" : isUp ? "text-up" : "text-down",
            )}
          >
            {data
              ? `${formatNumber(data.change)} (${formatPercent(data.changePercent)})`
              : "—"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
          <Stat label="시가" value={data?.open} />
          <Stat label="고가" value={data?.high} />
          <Stat label="저가" value={data?.low} />
          <Stat label="전일종가" value={data?.prevClose} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex gap-2">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="tabular-nums">{value !== undefined ? formatNumber(value) : "-"}</span>
    </div>
  );
}
