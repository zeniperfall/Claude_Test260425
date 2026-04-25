import "server-only";
import yahooFinanceImport from "yahoo-finance2";
import type { Candle, Financials, Quote, SymbolInfo } from "@/lib/types";

// yahoo-finance2 v3 ships a Proxy default export whose method types collapse
// to `never` under strict TS. Cast to a permissive shape for our usage.
type YFLoose = {
  suppressNotices?: (notices: string[]) => void;
  quote: (sym: string) => Promise<Record<string, unknown>>;
  search: (
    q: string,
    opts?: Record<string, unknown>,
  ) => Promise<{ quotes?: Record<string, unknown>[] }>;
  chart: (
    sym: string,
    opts: Record<string, unknown>,
  ) => Promise<{ quotes?: Record<string, unknown>[] }>;
  quoteSummary: (
    sym: string,
    opts: Record<string, unknown>,
  ) => Promise<Record<string, Record<string, unknown> | undefined>>;
};
const yf = yahooFinanceImport as unknown as YFLoose;

try {
  yf.suppressNotices?.(["yahooSurvey", "ripHistorical"]);
} catch {
  // noop
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export async function yahooQuote(symbol: string): Promise<Quote | null> {
  try {
    const q = await yf.quote(symbol);
    const price = num(q.regularMarketPrice);
    if (!q || price === undefined) return null;
    return {
      symbol: str(q.symbol) ?? symbol,
      name: str(q.longName) ?? str(q.shortName) ?? str(q.symbol) ?? symbol,
      price,
      change: num(q.regularMarketChange) ?? 0,
      changePercent: num(q.regularMarketChangePercent) ?? 0,
      open: num(q.regularMarketOpen),
      high: num(q.regularMarketDayHigh),
      low: num(q.regularMarketDayLow),
      prevClose: num(q.regularMarketPreviousClose),
      volume: num(q.regularMarketVolume),
      marketCap: num(q.marketCap),
      currency: str(q.currency),
    };
  } catch {
    return null;
  }
}

export async function yahooSearch(query: string): Promise<SymbolInfo[]> {
  if (!query.trim()) return [];
  try {
    const r = await yf.search(query, { quotesCount: 10, newsCount: 0 });
    return (r.quotes ?? [])
      .filter((q) => typeof q.symbol === "string")
      .map((q) => {
        const sym = q.symbol as string;
        const exchange = str(q.exchange) ?? "";
        let market: "US" | "KR" | "CN" = "US";
        if (sym.endsWith(".KS") || sym.endsWith(".KQ") || exchange === "KSC" || exchange === "KOE")
          market = "KR";
        else if (
          sym.endsWith(".SS") ||
          sym.endsWith(".SZ") ||
          exchange === "SHH" ||
          exchange === "SHZ"
        )
          market = "CN";
        return {
          symbol: sym,
          name: str(q.longname) ?? str(q.shortname) ?? sym,
          market,
          exchange,
        } as SymbolInfo;
      });
  } catch {
    return [];
  }
}

export async function yahooCandles(
  symbol: string,
  range: string,
  interval: string,
): Promise<Candle[]> {
  try {
    const period2 = new Date();
    const period1 = new Date(rangeToMs(range, period2));
    const r = await yf.chart(symbol, { period1, period2, interval });
    return (r.quotes ?? [])
      .filter((c) => {
        return (
          c.date &&
          num(c.open) !== undefined &&
          num(c.high) !== undefined &&
          num(c.low) !== undefined &&
          num(c.close) !== undefined
        );
      })
      .map((c) => ({
        time: Math.floor(new Date(c.date as Date | string).getTime() / 1000),
        open: num(c.open)!,
        high: num(c.high)!,
        low: num(c.low)!,
        close: num(c.close)!,
        volume: num(c.volume),
      }));
  } catch {
    return [];
  }
}

export async function yahooFinancials(symbol: string): Promise<Financials | null> {
  try {
    const [q, summary] = await Promise.all([
      yf.quote(symbol),
      yf
        .quoteSummary(symbol, {
          modules: ["summaryDetail", "defaultKeyStatistics", "assetProfile", "summaryProfile"],
        })
        .catch(() => null),
    ]);
    const sd = (summary?.summaryDetail ?? {}) as Record<string, unknown>;
    const ks = (summary?.defaultKeyStatistics ?? {}) as Record<string, unknown>;
    const profile =
      (summary?.assetProfile as Record<string, unknown> | undefined) ??
      (summary?.summaryProfile as Record<string, unknown> | undefined) ??
      {};
    return {
      marketCap: num(q.marketCap),
      peRatio: num(q.trailingPE) ?? num(sd.trailingPE),
      eps: num(q.epsTrailingTwelveMonths) ?? num(ks.trailingEps),
      dividendYield: num(sd.dividendYield),
      beta: num(sd.beta) ?? num(ks.beta),
      fiftyTwoWeekHigh: num(q.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: num(q.fiftyTwoWeekLow),
      averageVolume: num(q.averageDailyVolume3Month) ?? num(sd.averageVolume),
      sector: str(profile.sector),
      industry: str(profile.industry),
      description: str(profile.longBusinessSummary),
    };
  } catch {
    return null;
  }
}

function rangeToMs(range: string, now: Date): number {
  const day = 24 * 60 * 60 * 1000;
  const t = now.getTime();
  switch (range) {
    case "1d":
      return t - 1 * day;
    case "5d":
      return t - 7 * day;
    case "1mo":
      return t - 31 * day;
    case "3mo":
      return t - 92 * day;
    case "6mo":
      return t - 183 * day;
    case "1y":
      return t - 366 * day;
    case "5y":
      return t - 5 * 366 * day;
    default:
      return t - 92 * day;
  }
}
