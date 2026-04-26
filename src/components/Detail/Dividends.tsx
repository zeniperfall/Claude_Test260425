"use client";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import type { DividendData } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { Skeleton } from "@/components/Skeleton";

export function Dividends() {
  const selected = useAppStore((s) => s.selected);
  const { data, isFetching } = useQuery({
    queryKey: ["dividends", selected?.symbol],
    queryFn: async () => {
      if (!selected) return null;
      const r = await fetch(`/api/dividends?symbol=${encodeURIComponent(selected.symbol)}`);
      if (!r.ok) return null;
      return (await r.json()) as DividendData;
    },
    enabled: !!selected,
    staleTime: 60 * 60_000,
  });

  if (isFetching && !data) {
    return (
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  if (!data || (data.history.length === 0 && !data.trailingYield)) {
    return (
      <div className="p-3 text-xs text-[var(--text-secondary)]">배당 이력이 없습니다.</div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div>
        <div className="text-[10px] uppercase text-[var(--text-secondary)] mb-1">
          배당 요약
        </div>
        <div className="grid grid-cols-2 gap-y-1 text-xs">
          {data.trailingYield !== undefined && (
            <Row label="배당수익률" value={`${(data.trailingYield * 100).toFixed(2)}%`} />
          )}
          {data.trailingAnnualAmount !== undefined && (
            <Row label="연간 배당금" value={formatNumber(data.trailingAnnualAmount)} />
          )}
          {data.exDividendDate && (
            <Row
              label="배당락일"
              value={new Date(data.exDividendDate).toLocaleDateString("ko-KR")}
            />
          )}
        </div>
      </div>
      {data.history.length > 0 && (
        <div>
          <div className="text-[10px] uppercase text-[var(--text-secondary)] mb-1">
            배당 이력 (최근 {Math.min(data.history.length, 20)}회)
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--text-secondary)]">
                <th className="text-left font-normal py-1">날짜</th>
                <th className="text-right font-normal">금액</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((d) => (
                <tr key={d.date} className="border-t border-[var(--border)]">
                  <td className="py-1">{d.date}</td>
                  <td className="text-right tabular-nums">{formatNumber(d.amount, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
