import { test, expect } from "./fixtures";

test("home page loads with default symbol and chart container", async ({ mockedPage }) => {
  await mockedPage.goto("/");
  await expect(mockedPage.getByText("Stock Vista")).toBeVisible();
  // Watchlist section
  await expect(mockedPage.getByText("워치리스트")).toBeVisible();
  // Default selected symbol header
  await expect(mockedPage.getByText("Apple Inc.").first()).toBeVisible({ timeout: 10_000 });
  // Right panel default tab
  await expect(mockedPage.getByRole("button", { name: "재무" })).toBeVisible();
});
