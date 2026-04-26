import { test, expect } from "./fixtures";

/**
 * Visual regression baseline. Screenshots only get baselined the first
 * time CI runs (use `--update-snapshots` locally to regenerate). For now
 * we use a soft assertion mode by capturing the screenshot but allowing
 * larger pixel diffs — strict mode can be enabled later.
 *
 * Stable elements only — we mask the chart canvas (always changes due to
 * timestamps) and the live timestamp/news fields.
 */

test("@visual home layout (header + watchlist + chart shell)", async ({ mockedPage }) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });
  // Wait for fonts/layout to settle
  await mockedPage.waitForTimeout(500);
  await expect(mockedPage).toHaveScreenshot("home.png", {
    fullPage: false,
    maxDiffPixelRatio: 0.05,
    mask: [mockedPage.locator("canvas"), mockedPage.locator("[data-volatile]")],
  });
});

test("@visual compare page", async ({ mockedPage }) => {
  await mockedPage.goto("/compare?symbols=AAPL,MSFT");
  await mockedPage.waitForSelector("text=종목 비교", { timeout: 15_000 });
  await mockedPage.waitForTimeout(500);
  await expect(mockedPage).toHaveScreenshot("compare.png", {
    maxDiffPixelRatio: 0.05,
    mask: [mockedPage.locator("canvas")],
  });
});

test("@visual market heatmap", async ({ mockedPage }) => {
  await mockedPage.goto("/market");
  await mockedPage.waitForSelector("text=시장 히트맵", { timeout: 15_000 });
  await mockedPage.waitForTimeout(500);
  await expect(mockedPage).toHaveScreenshot("heatmap.png", {
    maxDiffPixelRatio: 0.05,
  });
});
