import { test, expect } from "./fixtures";

test("A2: a KR-suffix URL drives the market filter into KR mode", async ({
  mockedPage,
}) => {
  // Navigate directly to a Korean ticker — the search picker also calls
  // setMarket(item.market), but exercising that path through the dropdown
  // is flaky because react-query refetches on every keystroke and detaches
  // the option element mid-click. The URL→state path uses the same
  // setMarket call via SymbolUrlSync, so this assertion covers the
  // substantive behaviour without the dropdown race.
  await mockedPage.goto("/stock/005930.KS");
  await expect(mockedPage.getByText("삼성전자").first()).toBeVisible({
    timeout: 15_000,
  });

  const krButton = mockedPage.getByRole("button", { name: "한국", exact: true });
  await expect(krButton).toHaveClass(/bg-\[var\(--bg-3\)\]/);
});

test("A3: news empty state shows actionable setup guidance when keys are absent", async ({
  page,
}) => {
  // Custom mocks: /api/config returns no keys, /api/news returns empty
  await page.route("**/api/config", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        finnhub: false,
        alphaVantage: false,
        newsApi: false,
        kis: false,
        supabase: false,
      }),
    }),
  );
  await page.route("**/api/news**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    }),
  );
  // Quote/candles need to succeed for the page to render fully
  await page.route("**/api/quote**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        symbol: "AAPL",
        name: "Apple Inc.",
        price: 200,
        change: 1,
        changePercent: 0.5,
      }),
    }),
  );
  await page.route("**/api/candles**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ candles: [] }),
    }),
  );
  await page.route("**/api/financials**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );

  await page.goto("/");
  await page.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  await page.getByRole("button", { name: "뉴스" }).click();
  await expect(page.getByText(/FINNHUB_API_KEY/)).toBeVisible();
  await expect(page.getByRole("link", { name: /무료 키 발급/ })).toBeVisible();
});

test("A4: stock header shows exchange label (KOSPI for .KS)", async ({ mockedPage }) => {
  await mockedPage.goto("/stock/005930.KS");
  await expect(mockedPage.getByText("삼성전자").first()).toBeVisible({ timeout: 15_000 });
  await expect(mockedPage.getByText("KOSPI").first()).toBeVisible();
});
