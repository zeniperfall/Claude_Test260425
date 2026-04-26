import { test, expect } from "./fixtures";

test("Feature 4: alerts panel adds, lists, and removes price alerts", async ({ mockedPage }) => {
  // Pre-grant Notification permission so the prompt doesn't appear
  await mockedPage.context().grantPermissions(["notifications"]);

  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  // Switch to alerts tab
  await mockedPage.getByRole("button", { name: "알림" }).click();
  await expect(mockedPage.getByText(/가격 알림/)).toBeVisible();

  // Add an alert
  await mockedPage.getByPlaceholder("목표가").fill("250");
  await mockedPage.getByRole("button", { name: "추가" }).click();

  await expect(mockedPage.getByText(/▲ 250/)).toBeVisible();

  // Remove it
  await mockedPage
    .locator("div:has-text('▲ 250')")
    .last()
    .locator("button")
    .last()
    .click();

  await expect(mockedPage.getByText("설정된 알림이 없습니다.")).toBeVisible();
});
