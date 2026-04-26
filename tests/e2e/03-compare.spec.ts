import { test, expect } from "./fixtures";

test("Feature 3: /compare page renders with default symbols and adds new ones", async ({
  mockedPage,
}) => {
  await mockedPage.goto("/compare");
  await expect(mockedPage.getByText("종목 비교")).toBeVisible();

  // Default symbols
  await expect(mockedPage.getByText("AAPL", { exact: true }).first()).toBeVisible();
  await expect(mockedPage.getByText("MSFT", { exact: true }).first()).toBeVisible();
  await expect(mockedPage.getByText("NVDA", { exact: true }).first()).toBeVisible();

  // Add a new symbol
  const input = mockedPage.getByPlaceholder(/심볼 추가/);
  await input.fill("TSLA");
  await input.press("Enter");

  await expect(mockedPage.getByText("TSLA", { exact: true }).first()).toBeVisible();
  await expect(mockedPage).toHaveURL(/symbols=.*TSLA/);
});

test("Feature 3: removing a symbol updates the URL", async ({ mockedPage }) => {
  await mockedPage.goto("/compare?symbols=AAPL,MSFT");
  await expect(mockedPage.getByText("AAPL", { exact: true }).first()).toBeVisible();

  // Click X next to AAPL chip
  await mockedPage.locator("span:has-text('AAPL') >> button").first().click();
  await expect(mockedPage).toHaveURL(/symbols=MSFT$/, { timeout: 5_000 });
});
