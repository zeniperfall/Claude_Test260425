"use client";
import { MARKETS } from "@/lib/markets";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

export function MarketFilter() {
  const market = useAppStore((s) => s.market);
  const setMarket = useAppStore((s) => s.setMarket);
  return (
    <div className="flex items-center gap-1 bg-[var(--bg-2)] border border-[var(--border)] rounded p-0.5">
      {MARKETS.map((m) => (
        <button
          key={m.key}
          onClick={() => setMarket(m.key)}
          className={cn(
            "px-2.5 py-1 text-xs rounded transition-colors",
            market === m.key
              ? "bg-[var(--bg-3)] text-white"
              : "text-[var(--text-secondary)] hover:text-white",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
