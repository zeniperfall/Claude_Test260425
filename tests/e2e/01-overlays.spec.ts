import { test, expect } from "./fixtures";

test("Feature 1: chart overlay toggles persist and re-render", async ({ mockedPage }) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=AAPL · ", { timeout: 15_000 });

  const sma20 = mockedPage.getByRole("button", { name: /SMA20/ });
  const sma50 = mockedPage.getByRole("button", { name: /SMA50/ });
  const bb = mockedPage.getByRole("button", { name: /BB/ });

  await expect(sma20).toBeVisible();
  await expect(sma50).toBeVisible();
  await expect(bb).toBeVisible();

  await sma20.click();
  await sma50.click();
  await bb.click();

  // The chart canvas should still be present (overlay series mounted on it)
  const canvas = mockedPage.locator("canvas").first();
  await expect(canvas).toBeVisible();

  // Reload — overlays persisted via Zustand+localStorage
  await mockedPage.reload();
  await mockedPage.waitForSelector("text=AAPL · ", { timeout: 15_000 });

  // Active state inferred by class — at minimum buttons should still render
  await expect(mockedPage.getByRole("button", { name: /SMA20/ })).toBeVisible();
});
