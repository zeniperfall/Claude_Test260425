import { test, expect } from "./fixtures";

/**
 * Feature 7 (Supabase auth) gracefully degrades to "로컬 모드" when env
 * vars aren't set — which is the CI default. We verify the degraded state
 * so a Supabase misconfiguration doesn't break the rest of the app.
 */
test("Feature 7: shows local-mode badge when Supabase env is unset", async ({ mockedPage }) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });
  await expect(mockedPage.getByText("로컬 모드")).toBeVisible();
});
