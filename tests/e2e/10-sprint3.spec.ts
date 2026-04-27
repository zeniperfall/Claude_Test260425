import { test, expect } from "./fixtures";

test("C1: portfolio panel adds and tracks a position", async ({ mockedPage }) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  await mockedPage.getByRole("button", { name: "포트폴리오" }).click();
  await mockedPage.getByPlaceholder("수량").fill("10");
  await mockedPage.getByPlaceholder("평단가").fill("150");
  // force:true bypasses Playwright's stability heuristic, which can flake
  // when background pollers (AlertsManager / chart lazy-load) cause minor
  // sibling re-renders during the click dispatch.
  await mockedPage.getByRole("button", { name: "포트폴리오에 추가" }).click({ force: true });

  // Total summary should appear
  await expect(mockedPage.getByText("평가").first()).toBeVisible();
  await expect(mockedPage.getByText("원가").first()).toBeVisible();

  // The AAPL row appears
  await expect(mockedPage.getByText("AAPL").first()).toBeVisible();
});

test("C2: dividends panel renders", async ({ mockedPage }) => {
  // Mock dividends endpoint with sample data
  await mockedPage.route("**/api/dividends**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        history: [
          { date: "2025-08-15", amount: 0.24 },
          { date: "2025-05-15", amount: 0.24 },
          { date: "2025-02-15", amount: 0.23 },
        ],
        trailingYield: 0.0048,
        trailingAnnualAmount: 0.95,
        exDividendDate: "2025-08-08",
      }),
    }),
  );

  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  await mockedPage.getByRole("button", { name: "배당" }).click();
  await expect(mockedPage.getByText("배당 요약")).toBeVisible();
  await expect(mockedPage.getByText("2025-08-15")).toBeVisible();
});

test("C3: market heatmap page renders cells with prices", async ({ mockedPage }) => {
  await mockedPage.goto("/market");
  await expect(mockedPage.getByText("시장 히트맵")).toBeVisible();
  // Default market is US — AAPL should be among the cells
  await expect(mockedPage.getByText("AAPL").first()).toBeVisible({ timeout: 15_000 });
});

test("C6: notes panel autosaves text per symbol", async ({ mockedPage }) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  await mockedPage.getByRole("button", { name: "메모" }).click();
  const textarea = mockedPage.getByPlaceholder(/투자 노트/);
  await textarea.fill("AAPL 매수 사유: 강한 실적");
  // Wait for autosave indicator
  await expect(mockedPage.getByText("자동 저장됨", { exact: false })).toBeVisible();
});
