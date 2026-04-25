import "server-only";
import type { NewsItem, Quote } from "@/lib/types";

const BASE = "https://finnhub.io/api/v1";

function getKey(): string | null {
  return process.env.FINNHUB_API_KEY?.trim() || null;
}

interface FinnhubQuoteResponse {
  c: number; // current
  d: number; // change
  dp: number; // change percent
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

export async function finnhubQuote(symbol: string): Promise<Quote | null> {
  const key = getKey();
  if (!key) return null;
  try {
    const r = await fetch(`${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`, {
      next: { revalidate: 30 },
    });
    if (!r.ok) return null;
    const j = (await r.json()) as FinnhubQuoteResponse;
    if (!j.c) return null;
    return {
      symbol,
      name: symbol,
      price: j.c,
      change: j.d,
      changePercent: j.dp,
      open: j.o,
      high: j.h,
      low: j.l,
      prevClose: j.pc,
    };
  } catch {
    return null;
  }
}

interface FinnhubNewsItem {
  id: number;
  headline: string;
  url: string;
  source: string;
  datetime: number;
  summary: string;
  image: string;
}

export async function finnhubCompanyNews(symbol: string): Promise<NewsItem[]> {
  const key = getKey();
  if (!key) return [];
  const today = new Date();
  const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  try {
    const r = await fetch(
      `${BASE}/company-news?symbol=${encodeURIComponent(symbol)}&from=${fmt(past)}&to=${fmt(today)}&token=${key}`,
      { next: { revalidate: 600 } },
    );
    if (!r.ok) return [];
    const arr = (await r.json()) as FinnhubNewsItem[];
    return arr.slice(0, 20).map((n) => ({
      id: String(n.id),
      title: n.headline,
      url: n.url,
      source: n.source,
      publishedAt: new Date(n.datetime * 1000).toISOString(),
      summary: n.summary,
      image: n.image,
    }));
  } catch {
    return [];
  }
}
