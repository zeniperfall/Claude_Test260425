"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { ComparisonChart } from "@/components/Compare/ComparisonChart";
import { TimeframeSelector } from "@/components/Chart/TimeframeSelector";
import type { Candle, Timeframe } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLORS = ["#42a5f5", "#ef5350", "#26a69a", "#ffa726", "#ab47bc"];
const MAX_SYMBOLS = 5;

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[var(--text-secondary)]">로딩 중...</div>}>
      <CompareInner />
    </Suspense>
  );
}

function CompareInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = useMemo(() => {
    const raw = searchParams.get("symbols");
    if (!raw) return ["AAPL", "MSFT", "NVDA"];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_SYMBOLS);
  }, [searchParams]);

  const [symbols, setSymbols] = useState<string[]>(initial);
  const [input, setInput] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe>("3M");

  useEffect(() => {
    const url = `/compare?symbols=${encodeURIComponent(symbols.join(","))}`;
    router.replace(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(",")]);

  const queries = useQueries({
    queries: symbols.map((sym) => ({
      queryKey: ["compare-candles", sym, timeframe],
      queryFn: async () => {
        const r = await fetch(
          `/api/candles?symbol=${encodeURIComponent(sym)}&tf=${timeframe}`,
        );
        if (!r.ok) return { symbol: sym, candles: [] as Candle[] };
        const j = (await r.json()) as { candles: Candle[] };
        return { symbol: sym, candles: j.candles };
      },
      staleTime: 30_000,
    })),
  });

  const seriesData = queries.map((q, i) => ({
    symbol: symbols[i],
    candles: q.data?.candles ?? [],
  }));
  const isLoading = queries.some((q) => q.isFetching && !q.data);

  function addSymbol() {
    const s = input.trim().toUpperCase();
    if (!s) return;
    if (symbols.includes(s)) {
      setInput("");
      return;
    }
    if (symbols.length >= MAX_SYMBOLS) return;
    setSymbols([...symbols, s]);
    setInput("");
  }

  function removeSymbol(s: string) {
    setSymbols(symbols.filter((x) => x !== s));
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-1)]">
      <header className="h-12 flex items-center gap-3 px-4 border-b border-[var(--border)] flex-shrink-0">
        <Link
          href="/"
          className="p-1 rounded hover:bg-[var(--bg-2)] text-[var(--text-secondary)] hover:text-white"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="text-sm font-semibold">종목 비교</div>
        <div className="text-[11px] text-[var(--text-secondary)]">
          시작일 대비 % 변동률 (최대 {MAX_SYMBOLS}개)
        </div>
        <div className="ml-auto">
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </div>
      </header>

      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-2 flex-wrap">
        {symbols.map((s, i) => (
          <span
            key={s}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--bg-2)] border border-[var(--border)] text-xs"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            {s}
            <button
              onClick={() => removeSymbol(s)}
              className="text-[var(--text-secondary)] hover:text-down"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSymbol()}
            placeholder="심볼 추가 (예: TSLA, 005930.KS)"
            className="bg-[var(--bg-2)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none w-56 placeholder:text-[var(--text-secondary)]"
            disabled={symbols.length >= MAX_SYMBOLS}
          />
          <button
            onClick={addSymbol}
            disabled={symbols.length >= MAX_SYMBOLS || !input.trim()}
            className={cn(
              "p-1.5 rounded text-xs",
              symbols.length >= MAX_SYMBOLS || !input.trim()
                ? "text-[var(--text-secondary)] cursor-not-allowed"
                : "bg-[var(--accent)] text-white hover:opacity-90",
            )}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ComparisonChart series={seriesData} loading={isLoading} />
      </div>
    </div>
  );
}
