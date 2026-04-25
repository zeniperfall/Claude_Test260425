import "server-only";
import type { IndicatorPoint, Indicators } from "@/lib/types";

const BASE = "https://www.alphavantage.co/query";

function getKey(): string | null {
  return process.env.ALPHA_VANTAGE_API_KEY?.trim() || null;
}

async function fetchTechnical(
  fn: "RSI" | "MACD" | "SMA",
  symbol: string,
  extra: Record<string, string> = {},
): Promise<Record<string, Record<string, string>> | null> {
  const key = getKey();
  if (!key) return null;
  const params = new URLSearchParams({
    function: fn,
    symbol,
    interval: "daily",
    series_type: "close",
    apikey: key,
    ...extra,
  });
  try {
    const r = await fetch(`${BASE}?${params}`, { next: { revalidate: 60 * 60 } });
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, unknown>;
    const tsKey = Object.keys(j).find((k) => k.startsWith("Technical Analysis"));
    if (!tsKey) return null;
    return j[tsKey] as Record<string, Record<string, string>>;
  } catch {
    return null;
  }
}

function toPoints(
  series: Record<string, Record<string, string>> | null,
  field: string,
  limit = 90,
): IndicatorPoint[] {
  if (!series) return [];
  return Object.entries(series)
    .map(([date, vals]) => ({
      time: Math.floor(new Date(date).getTime() / 1000),
      value: parseFloat(vals[field]),
    }))
    .filter((p) => !Number.isNaN(p.value))
    .sort((a, b) => a.time - b.time)
    .slice(-limit);
}

export async function alphaVantageIndicators(symbol: string): Promise<Indicators> {
  // Free tier is 25 req/day. Fetch sequentially to avoid burst limits.
  const rsi = await fetchTechnical("RSI", symbol, { time_period: "14" });
  const sma20 = await fetchTechnical("SMA", symbol, { time_period: "20" });
  const sma50 = await fetchTechnical("SMA", symbol, { time_period: "50" });
  const macdRaw = await fetchTechnical("MACD", symbol);

  const macd = macdRaw
    ? Object.entries(macdRaw)
        .map(([date, vals]) => ({
          time: Math.floor(new Date(date).getTime() / 1000),
          macd: parseFloat(vals["MACD"]),
          signal: parseFloat(vals["MACD_Signal"]),
          hist: parseFloat(vals["MACD_Hist"]),
        }))
        .filter((p) => !Number.isNaN(p.macd))
        .sort((a, b) => a.time - b.time)
        .slice(-90)
    : [];

  return {
    rsi: toPoints(rsi, "RSI"),
    sma20: toPoints(sma20, "SMA"),
    sma50: toPoints(sma50, "SMA"),
    macd,
  };
}
