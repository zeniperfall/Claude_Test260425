"use client";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { NewsItem } from "@/lib/types";

export function News() {
  const selected = useAppStore((s) => s.selected);
  const { data, isFetching } = useQuery({
    queryKey: ["news", selected?.symbol],
    queryFn: async () => {
      if (!selected) return [];
      const params = new URLSearchParams({
        symbol: selected.symbol,
        name: selected.name,
      });
      const r = await fetch(`/api/news?${params}`);
      if (!r.ok) return [];
      const j = (await r.json()) as { items: NewsItem[] };
      return j.items;
    },
    enabled: !!selected,
    staleTime: 5 * 60_000,
  });

  if (isFetching && !data) {
    return <div className="p-3 text-xs text-[var(--text-secondary)]">로딩 중...</div>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="p-3 text-xs text-[var(--text-secondary)]">
        뉴스가 없습니다. (Finnhub / NewsAPI 키 설정 필요)
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {data.map((n) => (
        <a
          key={n.id}
          href={n.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 hover:bg-[var(--bg-2)] group"
        >
          <div className="flex justify-between items-start gap-2 mb-1">
            <span className="text-[10px] uppercase text-[var(--text-secondary)]">
              {n.source}
            </span>
            <ExternalLink size={11} className="text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
          </div>
          <div className="text-xs leading-snug group-hover:text-white">{n.title}</div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-1">
            {new Date(n.publishedAt).toLocaleString("ko-KR")}
          </div>
        </a>
      ))}
    </div>
  );
}
