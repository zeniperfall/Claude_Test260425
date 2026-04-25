"use client";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import type { Indicators as I } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

export function Indicators() {
  const selected = useAppStore((s) => s.selected);
  const { data } = useQuery({
    queryKey: ["indicators", selected?.symbol],
    queryFn: async () => {
      if (!selected) return null;
      const r = await fetch(`/api/indicators?symbol=${encodeURIComponent(selected.symbol)}`);
      if (!r.ok) return null;
      return (await r.json()) as I & { source?: string };
    },
    enabled: !!selected,
    staleTime: 10 * 60_000,
  });

  if (!data) return <div className="p-3 text-xs text-[var(--text-secondary)]">로딩 중...</div>;

  const lastRsi = data.rsi?.at(-1)?.value;
  const lastSma20 = data.sma20?.at(-1)?.value;
  const lastSma50 = data.sma50?.at(-1)?.value;
  const lastMacd = data.macd?.at(-1);

  const rsiState =
    lastRsi === undefined
      ? null
      : lastRsi > 70
      ? { label: "과매수", cls: "text-down" }
      : lastRsi < 30
      ? { label: "과매도", cls: "text-up" }
      : { label: "중립", cls: "text-[var(--text-secondary)]" };

  const macdState =
    lastMacd === undefined
      ? null
      : lastMacd.hist > 0
      ? { label: "강세", cls: "text-up" }
      : { label: "약세", cls: "text-down" };

  return (
    <div className="p-3 space-y-3">
      <div>
        <div className="text-[10px] uppercase text-[var(--text-secondary)] mb-1">
          기술적 지표
          {data.source && (
            <span className="ml-2 text-[9px] opacity-50">
              source: {data.source}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
          <IndicatorRow
            label="RSI(14)"
            value={lastRsi !== undefined ? formatNumber(lastRsi) : "-"}
            badge={rsiState?.label}
            badgeCls={rsiState?.cls}
          />
          <IndicatorRow
            label="MACD"
            value={lastMacd ? formatNumber(lastMacd.macd) : "-"}
            badge={macdState?.label}
            badgeCls={macdState?.cls}
          />
          <IndicatorRow label="SMA(20)" value={lastSma20 !== undefined ? formatNumber(lastSma20) : "-"} />
          <IndicatorRow label="SMA(50)" value={lastSma50 !== undefined ? formatNumber(lastSma50) : "-"} />
        </div>
      </div>

      {data.rsi && data.rsi.length > 0 && (
        <div>
          <div className="text-[10px] uppercase text-[var(--text-secondary)] mb-1">RSI 추이 (30일)</div>
          <RsiSparkline points={data.rsi.slice(-30).map((p) => p.value)} />
        </div>
      )}
    </div>
  );
}

function IndicatorRow({
  label,
  value,
  badge,
  badgeCls,
}: {
  label: string;
  value: string;
  badge?: string;
  badgeCls?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="tabular-nums">{value}</span>
        {badge && <span className={cn("text-[10px]", badgeCls)}>{badge}</span>}
      </div>
    </div>
  );
}

function RsiSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = 0;
  const max = 100;
  const w = 200;
  const h = 40;
  const step = w / (points.length - 1);
  const path = points
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / (max - min)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <line x1={0} y1={h * 0.3} x2={w} y2={h * 0.3} stroke="#ef535033" strokeDasharray="2,2" />
      <line x1={0} y1={h * 0.7} x2={w} y2={h * 0.7} stroke="#26a69a33" strokeDasharray="2,2" />
      <path d={path} fill="none" stroke="#2962ff" strokeWidth={1.5} />
    </svg>
  );
}
