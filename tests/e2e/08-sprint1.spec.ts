import { test, expect } from "./fixtures";

test("A2: picking a KR symbol from search auto-switches the market filter", async ({
  mockedPage,
}) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  // Open search and type a Korean ticker
  const search = mockedPage.getByPlaceholder(/종목 검색/);
  await search.click();
  await search.fill("005930");

  // Pick the result (search uses role="option" for keyboard navigation a11y)
  await mockedPage.getByRole("option", { name: /005930\.KS/ }).first().click();

  // Market filter should now show "한국" as active
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
