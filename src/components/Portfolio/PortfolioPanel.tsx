"use client";
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useAppStore } from "@/store/useAppStore";
import type { Quote } from "@/lib/types";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

export function PortfolioPanel() {
  const positions = usePortfolioStore((s) => s.positions);
  const upsert = usePortfolioStore((s) => s.upsert);
  const remove = usePortfolioStore((s) => s.remove);
  const selected = useAppStore((s) => s.selected);

  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");

  const quotes = useQueries({
    queries: positions.map((p) => ({
      queryKey: ["portfolio-quote", p.symbol],
      queryFn: async () => {
        const r = await fetch(`/api/quote?symbol=${encodeURIComponent(p.symbol)}`);
        if (!r.ok) return null;
        return (await r.json()) as Quote;
      },
      refetchInterval: 60_000,
      staleTime: 30_000,
    })),
  });

  const rows = positions.map((p, i) => {
    const q = quotes[i].data;
    const price = q?.price ?? 0;
    const marketValue = price * p.quantity;
    const costValue = p.avgCost * p.quantity;
    const pl = marketValue - costValue;
    const plPct = costValue ? (pl / costValue) * 100 : 0;
    return { p, q, price, marketValue, costValue, pl, plPct };
  });

  const totalMv = rows.reduce((s, r) => s + r.marketValue, 0);
  const totalCost = rows.reduce((s, r) => s + r.costValue, 0);
  const totalPl = totalMv - totalCost;
  const totalPlPct = totalCost ? (totalPl / totalCost) * 100 : 0;

  function handleAdd() {
    if (!selected) return;
    const q = parseFloat(qty);
    const c = parseFloat(cost);
    if (Number.isNaN(q) || Number.isNaN(c) || q <= 0 || c <= 0) return;
    upsert({
      symbol: selected.symbol,
      name: selected.name,
      market: selected.market,
      quantity: q,
      avgCost: c,
    });
    setQty("");
    setCost("");
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-[10px] uppercase text-[var(--text-secondary)]">
        보유 종목 ({positions.length})
      </div>

      {/* Add / update form for the currently selected symbol */}
      <div className="space-y-1">
        <div className="text-[11px] text-[var(--text-secondary)]">
          {selected?.symbol} 보유 등록 / 수정
        </div>
        <div className="flex gap-1">
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="수량"
            type="number"
            className="flex-1 bg-[var(--bg-2)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none placeholder:text-[var(--text-secondary)]"
          />
          <input
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="평단가"
            type="number"
            className="flex-1 bg-[var(--bg-2)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none placeholder:text-[var(--text-secondary)]"
          />
          <button
            onClick={handleAdd}
            disabled={!selected || !qty || !cost}
            className="px-2 py-1 rounded text-xs bg-[var(--accent)] text-white hover:opacity-90 disabled:bg-[var(--bg-3)] disabled:text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:hover:opacity-100"
            aria-label="포트폴리오에 추가"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Total summary */}
      {positions.length > 0 && (
        <div className="border-t border-[var(--border)] pt-2 grid grid-cols-3 gap-2 text-xs">
          <Cell label="평가" value={formatNumber(totalMv)} />
          <Cell label="원가" value={formatNumber(totalCost)} />
          <Cell
            label="손익"
            value={`${formatNumber(totalPl)} (${formatPercent(totalPlPct)})`}
            cls={totalPl >= 0 ? "text-up" : "text-down"}
          />
        </div>
      )}

      {/* Position list */}
      <div className="space-y-1.5">
        {positions.length === 0 && (
          <div className="text-[11px] text-[var(--text-secondary)]">
            보유 중인 종목이 없습니다.
          </div>
        )}
        {rows.map(({ p, price, pl, plPct }) => (
          <div
            key={p.symbol}
            className="border border-[var(--border)] bg-[var(--bg-2)] rounded p-2 space-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate">{p.symbol}</span>
                <span className="text-[10px] text-[var(--text-secondary)] truncate">
                  {p.name}
                </span>
              </div>
              <button
                onClick={() => remove(p.symbol)}
                className="text-[var(--text-secondary)] hover:text-down p-0.5"
                aria-label="포지션 삭제"
              >
                <Trash2 size={11} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <Cell label="수량" value={String(p.quantity)} />
              <Cell label="평단" value={formatNumber(p.avgCost)} />
              <Cell label="현재가" value={price ? formatNumber(price) : "-"} />
            </div>
            {price > 0 && (
              <div className="text-[11px] flex justify-between">
                <span className="text-[var(--text-secondary)]">평가손익</span>
                <span className={cn("tabular-nums", pl >= 0 ? "text-up" : "text-down")}>
                  {formatNumber(pl)} ({formatPercent(plPct)})
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Cell({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-[var(--text-secondary)]">{label}</span>
      <span className={cn("tabular-nums", cls)}>{value}</span>
    </div>
  );
}
