import { test, expect } from "./fixtures";

test("/api/candles/extend returns older candles before a given time", async ({
  page,
}) => {
  // Use a real route call (no mocks) — the route is also covered by the
  // standard quote/candles mocks pattern but extend is a separate path
  // worth smoke-testing.
  const beforeTs = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
  const r = await page.request.get(
    `/api/candles/extend?symbol=AAPL&before=${beforeTs}&interval=1d`,
  );
  expect(r.status()).toBe(200);
  const body = (await r.json()) as { candles: { time: number }[] };
  // Even when Yahoo is unreachable in test env, the route should respond
  // with an empty array — never 5xx.
  expect(Array.isArray(body.candles)).toBe(true);
  // If candles came back, they must all be strictly before `beforeTs`.
  for (const c of body.candles) {
    expect(c.time).toBeLessThan(beforeTs);
  }
});

test("chart triggers onLoadMore when user scrolls left", async ({ mockedPage }) => {
  // Track how many times /api/candles/extend is requested.
  let extendCalls = 0;
  await mockedPage.route("**/api/candles/extend**", async (route) => {
    extendCalls++;
    // Return a small batch of older candles
    const url = new URL(route.request().url());
    const before = Number(url.searchParams.get("before") ?? "0");
    const day = 24 * 3600;
    const older = Array.from({ length: 30 }, (_, i) => {
      const t = before - (30 - i) * day;
      return { time: t, open: 190, high: 195, low: 185, close: 192, volume: 1_000_000 };
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ candles: older }),
    });
  });

  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  // Programmatically scroll the chart's logical range to the left edge —
  // simulates the user dragging or zooming out far enough to trigger a load.
  // We do this via Playwright's `dispatchEvent` on the canvas: send a
  // wheel event with strong left/down delta to scroll back in time.
  const canvas = mockedPage.locator("canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 10_000 });

  // Several wheel scrolls to push the visible range past the left edge.
  for (let i = 0; i < 8; i++) {
    await canvas.dispatchEvent("wheel", { deltaY: -200, deltaX: -200 });
    await mockedPage.waitForTimeout(150);
  }

  // The lazy-loader should have fired at least once.
  await expect.poll(() => extendCalls, { timeout: 10_000 }).toBeGreaterThan(0);
});
