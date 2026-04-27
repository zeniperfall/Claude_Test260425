import { test as base, expect, type Page } from "@playwright/test";

/**
 * Deterministic API fixtures so tests run identically in CI without external
 * dependencies (Yahoo Finance, Finnhub, etc. — all blocked or rate-limited).
 *
 * Every spec gets a `mockedPage` page with all `/api/*` routes intercepted.
 */

export interface MockOverrides {
  quote?: Record<string, number>;
  candleCount?: number;
}

const DEFAULT_PRICES: Record<string, number> = {
  AAPL: 200,
  MSFT: 400,
  NVDA: 120,
  GOOGL: 170,
  TSLA: 250,
  "005930.KS": 75000,
  "000660.KS": 130000,
  "035420.KS": 200000,
  "035720.KS": 50000,
  "005380.KS": 240000,
  "600519.SS": 1700,
  "601318.SS": 50,
  "000858.SZ": 150,
  "000333.SZ": 70,
  "601988.SS": 4,
};

function makeCandles(symbol: string, count = 60, basePrice?: number) {
  const start = Math.floor(Date.now() / 1000) - count * 24 * 3600;
  const price = basePrice ?? DEFAULT_PRICES[symbol] ?? 100;
  // Deterministic pseudo-random generator seeded by symbol
  let seed = 0;
  for (const c of symbol) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };
  const candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = [];
  let last = price;
  for (let i = 0; i < count; i++) {
    const drift = rand() * price * 0.02;
    const open = last;
    const close = Math.max(0.01, last + drift);
    const high = Math.max(open, close) + Math.abs(rand()) * price * 0.01;
    const low = Math.min(open, close) - Math.abs(rand()) * price * 0.01;
    candles.push({
      time: start + i * 24 * 3600,
      open,
      high,
      low,
      close,
      volume: 1_000_000 + Math.floor(Math.abs(rand()) * 5_000_000),
    });
    last = close;
  }
  return candles;
}

function buildQuote(symbol: string, override?: number) {
  const price = override ?? DEFAULT_PRICES[symbol] ?? 100;
  const prev = price * 0.99;
  return {
    symbol,
    name: nameFor(symbol),
    price,
    change: price - prev,
    changePercent: ((price - prev) / prev) * 100,
    open: prev,
    high: price * 1.01,
    low: prev * 0.99,
    prevClose: prev,
    volume: 5_000_000,
    marketCap: price * 1_000_000_000,
    currency: symbol.endsWith(".KS") ? "KRW" : symbol.endsWith(".SS") || symbol.endsWith(".SZ") ? "CNY" : "USD",
  };
}

function nameFor(symbol: string): string {
  const NAMES: Record<string, string> = {
    AAPL: "Apple Inc.",
    MSFT: "Microsoft Corporation",
    NVDA: "NVIDIA Corporation",
    GOOGL: "Alphabet Inc.",
    TSLA: "Tesla Inc.",
    "005930.KS": "삼성전자",
    "000660.KS": "SK하이닉스",
    "035420.KS": "NAVER",
    "035720.KS": "카카오",
    "005380.KS": "현대차",
    "600519.SS": "Kweichow Moutai",
    "601318.SS": "Ping An Insurance",
    "000858.SZ": "Wuliangye Yibin",
    "000333.SZ": "Midea Group",
    "601988.SS": "Bank of China",
  };
  return NAMES[symbol] ?? symbol;
}

export async function installApiMocks(page: Page, overrides: MockOverrides = {}) {
  await page.route("**/api/quote**", async (route) => {
    const url = new URL(route.request().url());
    const symbol = url.searchParams.get("symbol") ?? "AAPL";
    const overridePrice = overrides.quote?.[symbol];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildQuote(symbol, overridePrice)),
    });
  });

  // Single matcher dispatches to /api/candles vs /api/candles/extend so we
  // don't depend on route registration order.
  await page.route("**/api/candles**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/api/candles/extend")) {
      // No further history available — tells the chart to stop asking.
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ candles: [] }),
      });
    }
    const symbol = url.searchParams.get("symbol") ?? "AAPL";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ candles: makeCandles(symbol, overrides.candleCount ?? 60) }),
    });
  });

  await page.route("**/api/search**", async (route) => {
    const url = new URL(route.request().url());
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const all = Object.keys(DEFAULT_PRICES).map((sym) => ({
      symbol: sym,
      name: nameFor(sym),
      market: sym.endsWith(".KS") || sym.endsWith(".KQ") ? "KR" : sym.endsWith(".SS") || sym.endsWith(".SZ") ? "CN" : "US",
    }));
    const results = all
      .filter((r) => r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
      .slice(0, 10);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results }),
    });
  });

  await page.route("**/api/financials**", async (route) => {
    const url = new URL(route.request().url());
    const symbol = url.searchParams.get("symbol") ?? "AAPL";
    const price = DEFAULT_PRICES[symbol] ?? 100;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        marketCap: price * 1_000_000_000,
        peRatio: 25.5,
        eps: 8.0,
        dividendYield: 0.005,
        beta: 1.2,
        fiftyTwoWeekHigh: price * 1.2,
        fiftyTwoWeekLow: price * 0.7,
        averageVolume: 50_000_000,
        sector: "Technology",
        industry: "Consumer Electronics",
        description: `${nameFor(symbol)} mocked description for testing.`,
      }),
    });
  });

  await page.route("**/api/news**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "n1",
            title: "Test news headline 1",
            url: "https://example.com/1",
            source: "Mock Wire",
            publishedAt: new Date().toISOString(),
            summary: "Mock summary.",
          },
          {
            id: "n2",
            title: "Test news headline 2",
            url: "https://example.com/2",
            source: "Mock Wire",
            publishedAt: new Date().toISOString(),
            summary: "Mock summary 2.",
          },
        ],
      }),
    });
  });

  await page.route("**/api/indicators**", async (route) => {
    const now = Math.floor(Date.now() / 1000);
    const points = (n: number, base: number) =>
      Array.from({ length: n }, (_, i) => ({ time: now - (n - i) * 86400, value: base + i * 0.1 }));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        source: "local",
        rsi: points(30, 50),
        sma20: points(30, 100),
        sma50: points(30, 95),
        macd: Array.from({ length: 30 }, (_, i) => ({
          time: now - (30 - i) * 86400,
          macd: 1 + i * 0.05,
          signal: 0.9 + i * 0.04,
          hist: 0.1 + i * 0.01,
        })),
      }),
    });
  });

  await page.route("**/api/earnings**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        history: [
          { date: "2025-09-30", period: "0q", epsActual: 1.65, epsEstimate: 1.6, epsSurprisePercent: 0.03 },
          { date: "2025-06-30", period: "-1q", epsActual: 1.4, epsEstimate: 1.43, epsSurprisePercent: -0.02 },
          { date: "2025-03-31", period: "-2q", epsActual: 1.55, epsEstimate: 1.5, epsSurprisePercent: 0.033 },
          { date: "2024-12-31", period: "-3q", epsActual: 2.4, epsEstimate: 2.35, epsSurprisePercent: 0.021 },
        ],
        upcoming: { date: "2026-01-30", epsEstimate: 1.7 },
        recommendationMean: 1.8,
        numberOfAnalysts: 35,
        targetMeanPrice: 250,
        targetHighPrice: 290,
        targetLowPrice: 200,
      }),
    });
  });
}

export const test = base.extend<{ mockedPage: Page }>({
  mockedPage: async ({ page }, use) => {
    await installApiMocks(page);
    await use(page);
  },
});

export { expect };
