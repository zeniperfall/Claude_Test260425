import "server-only";
import YahooFinance from "yahoo-finance2";
import type {
  Candle,
  DividendData,
  DividendEntry,
  EarningsData,
  EarningsRow,
  Financials,
  Quote,
  SymbolInfo,
} from "@/lib/types";
import { localizedName } from "@/lib/koreanNames";

// yahoo-finance2 v3 ships a Proxy default export whose method types collapse
// to `never` under strict TS. Cast to a permissive shape for our usage.
type YFLoose = {
  suppressNotices?: (notices: string[]) => void;
  setGlobalConfig?: (config: Record<string, unknown>) => void;
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
  ) => Promise<Record<string, unknown>>;
};
const yf = new (YahooFinance as unknown as new () => YFLoose)();

try {
  yf.suppressNotices?.(["yahooSurvey", "ripHistorical"]);
} catch {
  // noop
}
// Disable schema validation — Yahoo often returns extra/missing fields
// that crash the strict validator and cause silent failures in some regions.
try {
  yf.setGlobalConfig?.({
    validation: { logErrors: false, logOptionsErrors: false },
  });
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
    const fallbackName =
      str(q.longName) ?? str(q.shortName) ?? str(q.symbol) ?? symbol;
    return {
      symbol: str(q.symbol) ?? symbol,
      name: localizedName(symbol, fallbackName),
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
  } catch (err) {
    console.error("[yahoo]", err);
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
        const fallback = str(q.longname) ?? str(q.shortname) ?? sym;
        return {
          symbol: sym,
          name: localizedName(sym, fallback),
          market,
          exchange,
        } as SymbolInfo;
      });
  } catch (err) {
    console.error("[yahoo]", err);
    return [];
  }
}

export async function yahooCandles(
  symbol: string,
  range: string,
  interval: string,
): Promise<Candle[]> {
  const candles = await fetchCandlesOnce(symbol, range, interval);
  // Fallback: when an intraday interval returns nothing (market closed,
  // weekend, or instrument with no intraday support like KR/CN tickers
  // outside their trading session), retry with daily candles over a wider
  // window so the chart never stays empty for "1D".
  if (candles.length === 0 && /^(\d+m|\d+h)$/i.test(interval)) {
    return fetchCandlesOnce(symbol, "5d", "1d");
  }
  return candles;
}

async function fetchCandlesOnce(
  symbol: string,
  range: string,
  interval: string,
): Promise<Candle[]> {
  try {
    const period2 = new Date();
    const period1 = new Date(rangeToMs(range, period2));
    return await fetchCandlesByDateRange(symbol, period1, period2, interval);
  } catch (err) {
    console.error("[yahoo]", err);
    return [];
  }
}

async function fetchCandlesByDateRange(
  symbol: string,
  period1: Date,
  period2: Date,
  interval: string,
): Promise<Candle[]> {
  try {
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
  } catch (err) {
    console.error("[yahoo]", err);
    return [];
  }
}

/**
 * Fetches a window of historical candles ending strictly before `beforeEpoch`.
 * Used by the chart's infinite-scroll-back feature.
 *
 * Window size depends on the bar interval — fewer bars per call for large
 * intervals, since older data tails off and Yahoo caps response size.
 */
export async function yahooCandlesBefore(
  symbol: string,
  beforeEpoch: number,
  interval: string,
): Promise<Candle[]> {
  const day = 24 * 60 * 60 * 1000;
  // Cap at a small buffer before the existing leftmost candle so the new
  // window doesn't overlap (we trim duplicates client-side anyway).
  const period2 = new Date(beforeEpoch * 1000 - 1000);
  const windowMs = (() => {
    switch (interval) {
      case "1d":
        return 365 * day; // 1 year per request
      case "1wk":
        return 5 * 365 * day; // 5 years per request
      case "1mo":
        return 10 * 365 * day; // 10 years per request
      default:
        // Intraday — older intraday from Yahoo is often not available, but
        // attempt a 7-day window to support the few cases that do.
        return 7 * day;
    }
  })();
  const period1 = new Date(period2.getTime() - windowMs);
  return fetchCandlesByDateRange(symbol, period1, period2, interval);
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
  } catch (err) {
    console.error("[yahoo]", err);
    return null;
  }
}

export async function yahooEarnings(symbol: string): Promise<EarningsData> {
  try {
    const summary = await yf.quoteSummary(symbol, {
      modules: [
        "earningsHistory",
        "earningsTrend",
        "calendarEvents",
        "financialData",
      ],
    });

    const historyMod = summary?.earningsHistory as
      | { history?: Record<string, unknown>[] }
      | undefined;
    const calendar = summary?.calendarEvents as
      | { earnings?: Record<string, unknown> }
      | undefined;
    const fd = summary?.financialData as Record<string, unknown> | undefined;

    const history: EarningsRow[] = (historyMod?.history ?? [])
      .map((h) => {
        const dateRaw = h.quarter as { fmt?: string } | string | undefined;
        const date =
          typeof dateRaw === "string"
            ? dateRaw
            : (dateRaw as { fmt?: string } | undefined)?.fmt ?? "";
        return {
          date,
          period: str(h.period as unknown),
          epsActual: numFromObj(h.epsActual),
          epsEstimate: numFromObj(h.epsEstimate),
          epsSurprise: numFromObj(h.epsDifference),
          epsSurprisePercent: numFromObj(h.surprisePercent),
        };
      })
      .filter((r) => r.date)
      .reverse(); // most recent first

    const earningsCal = calendar?.earnings as Record<string, unknown> | undefined;
    const upcomingDateRaw = earningsCal?.earningsDate as unknown[] | undefined;
    let upcomingDate: string | undefined;
    if (Array.isArray(upcomingDateRaw) && upcomingDateRaw.length > 0) {
      const first = upcomingDateRaw[0];
      if (typeof first === "string") upcomingDate = first;
      else if (typeof first === "object" && first !== null) {
        upcomingDate = (first as { fmt?: string }).fmt;
      }
    }
    const upcoming = upcomingDate
      ? {
          date: upcomingDate,
          epsEstimate: numFromObj(earningsCal?.earningsAverage),
          revenueEstimate: numFromObj(earningsCal?.revenueAverage),
        }
      : undefined;

    return {
      history: history.slice(0, 8),
      upcoming,
      recommendationMean: numFromObj(fd?.recommendationMean),
      numberOfAnalysts: numFromObj(fd?.numberOfAnalystOpinions),
      targetMeanPrice: numFromObj(fd?.targetMeanPrice),
      targetHighPrice: numFromObj(fd?.targetHighPrice),
      targetLowPrice: numFromObj(fd?.targetLowPrice),
    };
  } catch (err) {
    console.error("[yahoo]", err);
    return { history: [] };
  }
}

export async function yahooDividends(symbol: string): Promise<DividendData> {
  try {
    const period2 = new Date();
    const period1 = new Date(period2.getTime() - 5 * 366 * 24 * 60 * 60 * 1000);
    const r = await yf.chart(symbol, {
      period1,
      period2,
      interval: "1d",
      events: "div",
    });
    const events = r as unknown as {
      events?: { dividends?: Record<string, { amount?: number; date?: Date | string }> };
    };
    const divObj = events.events?.dividends ?? {};
    const history: DividendEntry[] = Object.values(divObj)
      .map((d) => ({
        date:
          d.date instanceof Date
            ? d.date.toISOString().slice(0, 10)
            : typeof d.date === "string"
            ? d.date.slice(0, 10)
            : "",
        amount: typeof d.amount === "number" ? d.amount : 0,
      }))
      .filter((d) => d.date && d.amount > 0)
      .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first

    let summary: Record<string, unknown> | null = null;
    try {
      summary = await yf.quoteSummary(symbol, { modules: ["summaryDetail"] });
    } catch {
      // ignore
    }
    const sd = (summary?.summaryDetail ?? {}) as Record<string, unknown>;

    return {
      history: history.slice(0, 20),
      trailingYield: numFromObj(sd.trailingAnnualDividendYield),
      trailingAnnualAmount: numFromObj(sd.trailingAnnualDividendRate),
      exDividendDate: str(sd.exDividendDate as unknown),
    };
  } catch (err) {
    console.error("[yahoo]", err);
    return { history: [] };
  }
}

/**
 * Yahoo response objects can be either a primitive number or
 * `{ raw: number, fmt: string }`. This unwraps both shapes.
 */
function numFromObj(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "raw" in v) {
    const raw = (v as { raw?: unknown }).raw;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  }
  return undefined;
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
