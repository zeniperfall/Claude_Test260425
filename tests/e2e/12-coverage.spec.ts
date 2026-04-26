import { test, expect } from "./fixtures";

test("timeframe selector switches active button styling", async ({ mockedPage }) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  // The default timeframe (3M) should be active
  const tf1Y = mockedPage.getByRole("button", { name: "1Y", exact: true });
  await tf1Y.click();
  await expect(tf1Y).toHaveClass(/bg-\[var\(--bg-3\)\]/);
});

test("market filter switches default symbol when changed", async ({ mockedPage }) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  await mockedPage.getByRole("button", { name: "한국", exact: true }).click();
  await expect(mockedPage.getByText("삼성전자").first()).toBeVisible({ timeout: 10_000 });

  await mockedPage.getByRole("button", { name: "중국", exact: true }).click();
  await expect(mockedPage.getByText(/Kweichow Moutai|600519/).first()).toBeVisible({
    timeout: 10_000,
  });
});

test("/api/errors endpoint accepts client error reports", async ({ mockedPage }) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  const response = await mockedPage.request.post("/api/errors", {
    data: {
      message: "Test error from e2e",
      source: "test.js",
      line: 1,
      column: 1,
    },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
});

test("watchlist drawer opens on mobile viewport", async ({ mockedPage }) => {
  await mockedPage.setViewportSize({ width: 375, height: 800 });
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  await mockedPage.getByRole("button", { name: "워치리스트 토글" }).click();
  await expect(mockedPage.getByText("워치리스트").first()).toBeVisible();
});
