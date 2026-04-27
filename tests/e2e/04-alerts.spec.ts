import { test, expect } from "./fixtures";

test("Feature 4: alerts panel adds, lists, and removes price alerts", async ({ mockedPage }) => {
  // Pre-grant Notification permission so the prompt doesn't appear
  await mockedPage.context().grantPermissions(["notifications"]);

  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  // Switch to alerts tab
  await mockedPage.getByRole("button", { name: "알림" }).click();
  await expect(mockedPage.getByText(/가격 알림/)).toBeVisible();

  // Add an alert. Use force:true to skip the actionability "stable" check
  // — the AlertsManager polling and chart lazy-load can cause harmless
  // micro re-renders that throw off Playwright's stability heuristic on
  // CI runners but don't affect real users.
  await mockedPage.getByPlaceholder("목표가").fill("250");
  await mockedPage.getByRole("button", { name: "추가" }).click({ force: true });

  // Wait for the row to appear by its delete button (more reliable than text match)
  const deleteBtn = mockedPage.getByRole("button", { name: "알림 삭제" });
  await expect(deleteBtn).toBeVisible({ timeout: 10_000 });

  // Remove
  await deleteBtn.first().click({ force: true });

  await expect(mockedPage.getByText("설정된 알림이 없습니다.")).toBeVisible();
});
