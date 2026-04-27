import { test, expect } from "./fixtures";

test("B2: KR symbol shows localized Korean name", async ({ mockedPage }) => {
  await mockedPage.goto("/stock/005930.KS");
  await expect(mockedPage.getByText("삼성전자").first()).toBeVisible({ timeout: 15_000 });
});

test("B4: search keyboard navigation (ArrowDown + Enter selects)", async ({ mockedPage }) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  const search = mockedPage.getByPlaceholder(/종목 검색/);
  await search.click();
  await search.fill("MSFT");

  // Wait for results to render
  await expect(mockedPage.getByRole("listbox")).toBeVisible();
  await expect(mockedPage.getByRole("option").first()).toBeVisible();
  // Brief settle so react-query's response doesn't reset highlight while we press
  await mockedPage.waitForTimeout(150);

  await search.press("ArrowDown");
  await search.press("Enter");

  // Should have switched to MSFT — allow time for the redirect + price header refresh
  await expect(mockedPage.getByText("Microsoft Corporation").first()).toBeVisible({
    timeout: 10_000,
  });
});

test("B5: alert badge appears in header when an alert is triggered", async ({ mockedPage }) => {
  // The alert price 100 with condition 'below' will trigger immediately since
  // mocked AAPL price is 200 (below=200<=100 ? no — flip to above with target<price)
  await mockedPage.context().grantPermissions(["notifications"]);

  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  await mockedPage.getByRole("button", { name: "알림" }).click();
  await mockedPage.getByPlaceholder("목표가").fill("100");
  // condition default = "above"; 200 >= 100 triggers immediately
  await mockedPage.getByRole("button", { name: "추가" }).click();

  // The badge polls every 30s but on add the AlertsManager runs quote query;
  // wait up to 60s for badge to appear (we don't want flaky timeout-based tests)
  await expect(mockedPage.locator("header").getByText(/^\d+$/)).toBeVisible({
    timeout: 60_000,
  });
});

test("B3: mobile viewport collapses sidebars (drawers)", async ({ mockedPage }) => {
  await mockedPage.setViewportSize({ width: 375, height: 800 });
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  // Watchlist toggle button is visible on mobile (hidden on lg)
  await expect(mockedPage.getByRole("button", { name: "워치리스트 토글" })).toBeVisible();
  await expect(mockedPage.getByRole("button", { name: "상세 패널 토글" })).toBeVisible();
});
