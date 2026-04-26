import { test, expect } from "./fixtures";

/**
 * Feature 6 (KIS) is exercised at the route handler level: when KIS keys
 * aren't configured (the CI default), `/api/quote` falls back to Yahoo —
 * which we mock. We verify that a Korean ticker still renders correctly so
 * the KIS code path doesn't break the fallback.
 */
test("Feature 6: KR ticker still renders via fallback when KIS keys are absent", async ({
  mockedPage,
}) => {
  await mockedPage.goto("/stock/005930.KS");
  await expect(mockedPage.getByText("삼성전자").first()).toBeVisible({ timeout: 15_000 });
  // KRW currency from the mocked quote
  await expect(mockedPage.getByText("KRW").first()).toBeVisible();
});
