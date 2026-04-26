"use client";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import type { EarningsData } from "@/lib/types";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

const RECOMMENDATION_LABEL: Record<number, { label: string; cls: string }> = {
  1: { label: "강력 매수", cls: "text-up" },
  2: { label: "매수", cls: "text-up" },
  3: { label: "보유", cls: "text-[var(--text-secondary)]" },
  4: { label: "매도", cls: "text-down" },
  5: { label: "강력 매도", cls: "text-down" },
};

function recommendationLabel(mean?: number) {
  if (mean == null) return null;
  const rounded = Math.round(mean);
  return RECOMMENDATION_LABEL[rounded] ?? RECOMMENDATION_LABEL[3];
}

export function Earnings() {
  const selected = useAppStore((s) => s.selected);
  const { data, isFetching } = useQuery({
    queryKey: ["earnings", selected?.symbol],
    queryFn: async () => {
      if (!selected) return null;
      const r = await fetch(`/api/earnings?symbol=${encodeURIComponent(selected.symbol)}`);
      if (!r.ok) return null;
      return (await r.json()) as EarningsData;
    },
    enabled: !!selected,
    staleTime: 30 * 60_000,
  });

  if (isFetching && !data) {
    return <div className="p-3 text-xs text-[var(--text-secondary)]">로딩 중...</div>;
  }
  if (!data || (!data.history?.length && !data.upcoming && !data.targetMeanPrice)) {
    return <div className="p-3 text-xs text-[var(--text-secondary)]">실적 데이터가 없습니다.</div>;
  }

  const rec = recommendationLabel(data.recommendationMean);

  return (
    <div className="p-3 space-y-3">
      {/* Analyst consensus */}
      {(data.recommendationMean !== undefined || data.targetMeanPrice !== undefined) && (
        <div>
          <div className="text-[10px] uppercase text-[var(--text-secondary)] mb-1">
            애널리스트 컨센서스
            {data.numberOfAnalysts !== undefined && (
              <span className="ml-1.5 text-[9px] opacity-60">({data.numberOfAnalysts}명)</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-xs">
            {rec && (
              <Row
                label="투자의견"
                value={
                  <span className={cn("flex items-center gap-2", rec.cls)}>
                    {rec.label}
                    {data.recommendationMean !== undefined && (
                      <span className="text-[10px] opacity-70">
                        {formatNumber(data.recommendationMean)}
                      </span>
                    )}
                  </span>
                }
              />
            )}
            {data.targetMeanPrice !== undefined && (
              <Row label="평균 목표가" value={formatNumber(data.targetMeanPrice)} />
            )}
            {data.targetHighPrice !== undefined && (
              <Row label="최고 목표가" value={formatNumber(data.targetHighPrice)} />
            )}
            {data.targetLowPrice !== undefined && (
              <Row label="최저 목표가" value={formatNumber(data.targetLowPrice)} />
            )}
          </div>
        </div>
      )}

      {/* Upcoming earnings */}
      {data.upcoming && (
        <div className="border-t border-[var(--border)] pt-3">
          <div className="text-[10px] uppercase text-[var(--text-secondary)] mb-1">
            다음 실적 발표
          </div>
          <div className="text-xs space-y-1">
            <Row label="발표일" value={data.upcoming.date} />
            {data.upcoming.epsEstimate !== undefined && (
              <Row label="EPS 추정치" value={formatNumber(data.upcoming.epsEstimate)} />
            )}
          </div>
        </div>
      )}

      {/* Historical earnings */}
      {data.history && data.history.length > 0 && (
        <div className="border-t border-[var(--border)] pt-3">
          <div className="text-[10px] uppercase text-[var(--text-secondary)] mb-1">
            분기 실적 (최근 {data.history.length}분기)
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--text-secondary)]">
                <th className="text-left font-normal py-1">분기</th>
                <th className="text-right font-normal">실제</th>
                <th className="text-right font-normal">예상</th>
                <th className="text-right font-normal">서프라이즈</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((h) => {
                const surprise = h.epsSurprisePercent;
                const isUp = (surprise ?? 0) > 0;
                return (
                  <tr key={h.date} className="border-t border-[var(--border)]">
                    <td className="py-1.5">{h.date}</td>
                    <td className="text-right tabular-nums">
                      {h.epsActual !== undefined ? formatNumber(h.epsActual) : "-"}
                    </td>
                    <td className="text-right tabular-nums text-[var(--text-secondary)]">
                      {h.epsEstimate !== undefined ? formatNumber(h.epsEstimate) : "-"}
                    </td>
                    <td
                      className={cn(
                        "text-right tabular-nums",
                        surprise === undefined
                          ? "text-[var(--text-secondary)]"
                          : isUp
                          ? "text-up"
                          : "text-down",
                      )}
                    >
                      {surprise !== undefined ? formatPercent(surprise * 100) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 col-span-2">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
