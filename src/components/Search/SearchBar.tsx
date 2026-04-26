"use client";
import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import type { SymbolInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const setSelected = useAppStore((s) => s.setSelected);
  const setMarket = useAppStore((s) => s.setMarket);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const j = (await r.json()) as { results: SymbolInfo[] };
      return j.results;
    },
    enabled: query.trim().length > 0,
    staleTime: 60_000,
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Reset highlight when results change
  useEffect(() => {
    setHighlight(0);
  }, [data]);

  // Scroll highlighted into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function handlePick(item: SymbolInfo) {
    setMarket(item.market);
    setSelected({ symbol: item.symbol, name: item.name, market: item.market });
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !data || data.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i + 1) % data.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (i - 1 + data.length) % data.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = data[highlight];
      if (item) handlePick(item);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 bg-[var(--bg-2)] border border-[var(--border)] rounded px-3 py-1.5">
        <Search size={14} className="text-[var(--text-secondary)]" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="종목 검색 (예: AAPL, 005930.KS, 600519.SS)"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--text-secondary)] min-w-0"
          aria-label="종목 검색"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-[var(--text-secondary)] hover:text-white"
            aria-label="검색어 지우기"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && query.trim() && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-2)] border border-[var(--border)] rounded shadow-lg z-50 max-h-80 overflow-auto"
        >
          {isFetching && (
            <div className="px-3 py-2 text-xs text-[var(--text-secondary)]">검색 중...</div>
          )}
          {!isFetching && data && data.length === 0 && (
            <div className="px-3 py-2 text-xs text-[var(--text-secondary)]">결과 없음</div>
          )}
          {data?.map((r, i) => (
            <button
              key={r.symbol}
              onClick={() => handlePick(r)}
              onMouseEnter={() => setHighlight(i)}
              role="option"
              aria-selected={highlight === i}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-left",
                highlight === i ? "bg-[var(--bg-3)]" : "hover:bg-[var(--bg-3)]",
              )}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{r.symbol}</span>
                <span className="text-xs text-[var(--text-secondary)] truncate max-w-[280px]">
                  {r.name}
                </span>
              </div>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded",
                  r.market === "US" && "bg-blue-500/20 text-blue-400",
                  r.market === "KR" && "bg-red-500/20 text-red-400",
                  r.market === "CN" && "bg-yellow-500/20 text-yellow-400",
                )}
              >
                {r.market}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
