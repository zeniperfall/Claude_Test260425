"use client";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Info } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { NewsItem } from "@/lib/types";

interface ConfigInfo {
  finnhub: boolean;
  newsApi: boolean;
}

export function News() {
  const selected = useAppStore((s) => s.selected);

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const r = await fetch("/api/config");
      return (await r.json()) as ConfigInfo;
    },
    staleTime: Infinity,
  });

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
    const isUs = selected && !selected.symbol.includes(".");
    const usingFinnhub = isUs && !config?.finnhub;
    const usingNewsApi = !isUs && !config?.newsApi;
    return (
      <div className="p-3 space-y-3">
        <div className="text-xs text-[var(--text-secondary)]">
          뉴스 데이터가 없습니다.
        </div>
        {(usingFinnhub || usingNewsApi) && (
          <div className="flex items-start gap-2 p-2 rounded border border-[var(--border)] bg-[var(--bg-2)] text-[11px]">
            <Info size={12} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-[var(--text-secondary)]">
                {isUs ? "미국 종목 뉴스는 Finnhub" : "한국·중국 종목 뉴스는 NewsAPI"} 키가
                필요합니다.
              </div>
              <div className="text-[var(--text-secondary)]">
                <code className="text-[var(--text-primary)]">.env.local</code>에{" "}
                <code className="text-[var(--text-primary)]">
                  {isUs ? "FINNHUB_API_KEY" : "NEWSAPI_KEY"}
                </code>{" "}
                추가 후 재시작.
              </div>
              <a
                href={
                  isUs
                    ? "https://finnhub.io/register"
                    : "https://newsapi.org/register"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
              >
                무료 키 발급
                <ExternalLink size={10} />
              </a>
            </div>
          </div>
        )}
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
            <ExternalLink
              size={11}
              className="text-[var(--text-secondary)] flex-shrink-0 mt-0.5"
            />
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
