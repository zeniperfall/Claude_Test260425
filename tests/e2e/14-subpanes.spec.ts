import { test, expect } from "./fixtures";

test("Subchart toggles render alongside Main overlays in toolbar", async ({
  mockedPage,
}) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  // Main overlays still present
  await expect(mockedPage.getByRole("button", { name: /SMA20/ })).toBeVisible();

  // New subchart toggles
  await expect(mockedPage.getByRole("button", { name: /거래량/ })).toBeVisible();
  await expect(mockedPage.getByRole("button", { name: /RSI/ })).toBeVisible();
  await expect(mockedPage.getByRole("button", { name: /MACD/ })).toBeVisible();
});

test("Toggling RSI/MACD persists across reload (localStorage)", async ({
  mockedPage,
}) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  await mockedPage.getByRole("button", { name: /RSI/ }).click();
  await mockedPage.getByRole("button", { name: /MACD/ }).click();

  // Active state shows the bg-[var(--bg-3)] class
  await expect(mockedPage.getByRole("button", { name: /RSI/ })).toHaveClass(
    /bg-\[var\(--bg-3\)\]/,
  );
  await expect(mockedPage.getByRole("button", { name: /MACD/ })).toHaveClass(
    /bg-\[var\(--bg-3\)\]/,
  );

  await mockedPage.reload();
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  // Persisted
  await expect(mockedPage.getByRole("button", { name: /RSI/ })).toHaveClass(
    /bg-\[var\(--bg-3\)\]/,
  );
  await expect(mockedPage.getByRole("button", { name: /MACD/ })).toHaveClass(
    /bg-\[var\(--bg-3\)\]/,
  );
});

test("Chart wrapper is scrollable when many subcharts active", async ({
  mockedPage,
}) => {
  // Pre-seed all subcharts on so the inner chart container exceeds the
  // wrapper's available height in a tight viewport.
  await mockedPage.addInitScript(() => {
    const seeded = {
      state: {
        subcharts: { volume: true, rsi: true, macd: true },
      },
      version: 0,
    };
    const existing = localStorage.getItem("tv-stocks-app-state");
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        parsed.state = { ...parsed.state, subcharts: seeded.state.subcharts };
        localStorage.setItem("tv-stocks-app-state", JSON.stringify(parsed));
        return;
      } catch {
        // fall through
      }
    }
    localStorage.setItem("tv-stocks-app-state", JSON.stringify(seeded));
  });

  await mockedPage.setViewportSize({ width: 1200, height: 500 });
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  // Wait for chart to settle
  await mockedPage.waitForTimeout(500);

  // The chart wrapper is the relative container with overflow-y-auto holding canvases
  const scrollState = await mockedPage.evaluate(() => {
    const canvases = document.querySelectorAll("canvas");
    if (canvases.length === 0) return null;
    let el: HTMLElement | null = canvases[0] as HTMLElement;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        return {
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          scrollable: el.scrollHeight > el.clientHeight,
        };
      }
      el = el.parentElement;
    }
    return null;
  });

  expect(scrollState).not.toBeNull();
  // With viewport height 500 and three subcharts at min heights, the
  // inner content should overflow the wrapper.
  expect(scrollState!.scrollable).toBe(true);
});
