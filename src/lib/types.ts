export type Market = "US" | "KR" | "CN";

export type Timeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y";

export interface SymbolInfo {
  symbol: string;
  name: string;
  market: Market;
  exchange?: string;
  currency?: string;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open?: number;
  high?: number;
  low?: number;
  prevClose?: number;
  volume?: number;
  marketCap?: number;
  currency?: string;
  name?: string;
}

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
  image?: string;
}

export interface Financials {
  marketCap?: number;
  peRatio?: number;
  eps?: number;
  dividendYield?: number;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  averageVolume?: number;
  sector?: string;
  industry?: string;
  description?: string;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface Indicators {
  rsi?: IndicatorPoint[];
  macd?: { macd: number; signal: number; hist: number; time: number }[];
  sma20?: IndicatorPoint[];
  sma50?: IndicatorPoint[];
}

export interface EarningsRow {
  date: string;
  period?: string;
  epsActual?: number;
  epsEstimate?: number;
  epsSurprise?: number;
  epsSurprisePercent?: number;
  revenueActual?: number;
  revenueEstimate?: number;
}

export interface EarningsData {
  history: EarningsRow[];
  upcoming?: { date: string; epsEstimate?: number; revenueEstimate?: number };
  recommendationMean?: number;
  numberOfAnalysts?: number;
  targetMeanPrice?: number;
  targetHighPrice?: number;
  targetLowPrice?: number;
}
