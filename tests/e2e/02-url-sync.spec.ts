import { test, expect } from "./fixtures";

test("Feature 2: /stock/[symbol] dynamic route loads with that symbol selected", async ({
  mockedPage,
}) => {
  await mockedPage.goto("/stock/MSFT");
  await expect(mockedPage.getByText("Microsoft Corporation").first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(mockedPage).toHaveURL(/\/stock\/MSFT/);
});

test("Feature 2: clicking a watchlist item updates the URL", async ({ mockedPage }) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  // Click MSFT in the watchlist (it's pre-seeded by DEFAULT_SYMBOLS for US)
  await mockedPage.locator("aside").first().getByText("MSFT", { exact: true }).first().click();

  await expect(mockedPage).toHaveURL(/\/stock\/MSFT/, { timeout: 5_000 });
});
