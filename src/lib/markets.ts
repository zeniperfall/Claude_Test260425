import type { Market, Timeframe } from "./types";

export const MARKETS: { key: Market; label: string; flag: string }[] = [
  { key: "US", label: "미국", flag: "US" },
  { key: "KR", label: "한국", flag: "KR" },
  { key: "CN", label: "중국", flag: "CN" },
];

export const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "1Y", label: "1Y" },
  { key: "5Y", label: "5Y" },
];

/**
 * Maps a (market, raw symbol) pair to the Yahoo Finance ticker.
 * KR: 005930 -> 005930.KS (KOSPI), or .KQ (KOSDAQ) — default .KS.
 * CN: 600519 -> 600519.SS (Shanghai), 000001 -> 000001.SZ (Shenzhen).
 * US: passthrough.
 */
export function toYahooSymbol(symbol: string, market: Market): string {
  const s = symbol.trim().toUpperCase();
  if (s.includes(".")) return s;
  if (market === "US") return s;
  if (market === "KR") {
    // Default to KS (KOSPI). KOSDAQ tickers can be passed with .KQ explicitly.
    return /^\d{6}$/.test(s) ? `${s}.KS` : s;
  }
  if (market === "CN") {
    // 6 starts with 6 -> Shanghai (.SS), 0/3 -> Shenzhen (.SZ)
    if (/^6\d{5}$/.test(s)) return `${s}.SS`;
    if (/^[03]\d{5}$/.test(s)) return `${s}.SZ`;
    return s;
  }
  return s;
}

export function timeframeToRange(tf: Timeframe): {
  range: string;
  interval: string;
} {
  switch (tf) {
    case "1D":
      return { range: "1d", interval: "5m" };
    case "1W":
      return { range: "5d", interval: "30m" };
    case "1M":
      return { range: "1mo", interval: "1d" };
    case "3M":
      return { range: "3mo", interval: "1d" };
    case "6M":
      return { range: "6mo", interval: "1d" };
    case "1Y":
      return { range: "1y", interval: "1d" };
    case "5Y":
      return { range: "5y", interval: "1wk" };
  }
}

export const DEFAULT_SYMBOLS: Record<Market, { symbol: string; name: string }[]> = {
  US: [
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "MSFT", name: "Microsoft" },
    { symbol: "NVDA", name: "NVIDIA" },
    { symbol: "TSLA", name: "Tesla" },
    { symbol: "GOOGL", name: "Alphabet" },
  ],
  KR: [
    { symbol: "005930.KS", name: "삼성전자" },
    { symbol: "000660.KS", name: "SK하이닉스" },
    { symbol: "035420.KS", name: "NAVER" },
    { symbol: "035720.KS", name: "카카오" },
    { symbol: "005380.KS", name: "현대차" },
  ],
  CN: [
    { symbol: "600519.SS", name: "Kweichow Moutai" },
    { symbol: "601318.SS", name: "Ping An Insurance" },
    { symbol: "000858.SZ", name: "Wuliangye Yibin" },
    { symbol: "000333.SZ", name: "Midea Group" },
    { symbol: "601988.SS", name: "Bank of China" },
  ],
};
