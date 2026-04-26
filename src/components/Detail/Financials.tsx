"use client";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import type { Financials as F } from "@/lib/types";
import { formatCompact, formatNumber } from "@/lib/utils";
import { Skeleton } from "@/components/Skeleton";

export function Financials() {
  const selected = useAppStore((s) => s.selected);
  const { data } = useQuery({
    queryKey: ["financials", selected?.symbol],
    queryFn: async () => {
      if (!selected) return null;
      const r = await fetch(`/api/financials?symbol=${encodeURIComponent(selected.symbol)}`);
      if (!r.ok) return null;
      return (await r.json()) as F;
    },
    enabled: !!selected,
    staleTime: 5 * 60_000,
  });

  if (!data) {
    return (
      <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <Row label="시가총액" value={formatCompact(data.marketCap)} />
        <Row label="P/E" value={data.peRatio !== undefined ? formatNumber(data.peRatio) : "-"} />
        <Row label="EPS" value={data.eps !== undefined ? formatNumber(data.eps) : "-"} />
        <Row
          label="배당수익률"
          value={data.dividendYield !== undefined ? `${(data.dividendYield * 100).toFixed(2)}%` : "-"}
        />
        <Row label="베타" value={data.beta !== undefined ? formatNumber(data.beta) : "-"} />
        <Row label="평균 거래량" value={formatCompact(data.averageVolume)} />
        <Row label="52주 최고" value={data.fiftyTwoWeekHigh !== undefined ? formatNumber(data.fiftyTwoWeekHigh) : "-"} />
        <Row label="52주 최저" value={data.fiftyTwoWeekLow !== undefined ? formatNumber(data.fiftyTwoWeekLow) : "-"} />
      </div>
      {(data.sector || data.industry) && (
        <div className="text-xs space-y-1 pt-2 border-t border-[var(--border)]">
          {data.sector && (
            <div className="flex gap-2">
              <span className="text-[var(--text-secondary)] w-16">섹터</span>
              <span>{data.sector}</span>
            </div>
          )}
          {data.industry && (
            <div className="flex gap-2">
              <span className="text-[var(--text-secondary)] w-16">산업</span>
              <span>{data.industry}</span>
            </div>
          )}
        </div>
      )}
      {data.description && (
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed pt-2 border-t border-[var(--border)] line-clamp-6">
          {data.description}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
