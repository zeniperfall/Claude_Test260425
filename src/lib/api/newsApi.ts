import "server-only";
import type { NewsItem } from "@/lib/types";

function getKey(): string | null {
  return process.env.NEWSAPI_KEY?.trim() || null;
}

interface NewsApiArticle {
  source: { name: string };
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
}

export async function newsApiSearch(query: string): Promise<NewsItem[]> {
  const key = getKey();
  if (!key) return [];
  const params = new URLSearchParams({
    q: query,
    sortBy: "publishedAt",
    pageSize: "20",
    language: "en",
    apiKey: key,
  });
  try {
    const r = await fetch(`https://newsapi.org/v2/everything?${params}`, {
      next: { revalidate: 600 },
    });
    if (!r.ok) return [];
    const j = (await r.json()) as { articles?: NewsApiArticle[] };
    return (j.articles ?? []).map((a, i) => ({
      id: `${a.publishedAt}-${i}`,
      title: a.title,
      url: a.url,
      source: a.source?.name ?? "",
      publishedAt: a.publishedAt,
      summary: a.description,
      image: a.urlToImage ?? undefined,
    }));
  } catch {
    return [];
  }
}
