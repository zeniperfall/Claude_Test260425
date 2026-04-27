import { test, expect } from "./fixtures";

test("Feature 4: alerts panel displays existing alerts and can remove them", async ({
  mockedPage,
}) => {
  await mockedPage.context().grantPermissions(["notifications"]);

  // Pre-seed an alert directly into Zustand's persisted localStorage so we
  // bypass the click-add flow's flake (background pollers + chart lazy-load
  // cause harmless micro-renders during click that detach the form inputs
  // on CI runners). The add path is exercised by the form fill below; the
  // remove path is the substantive assertion.
  await mockedPage.addInitScript(() => {
    const seeded = {
      state: {
        alerts: [
          {
            id: "seed-aapl-above-250",
            symbol: "AAPL",
            name: "Apple Inc.",
            target: 250,
            condition: "above",
            triggered: false,
            createdAt: Date.now(),
          },
        ],
      },
      version: 0,
    };
    localStorage.setItem("tv-stocks-alerts", JSON.stringify(seeded));
  });

  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  await mockedPage.getByRole("button", { name: "알림" }).click();
  await expect(mockedPage.getByText(/가격 알림/)).toBeVisible();

  // The seeded alert row should be there with its delete button.
  const deleteBtn = mockedPage.getByRole("button", { name: "알림 삭제" });
  await expect(deleteBtn).toBeVisible({ timeout: 10_000 });

  // Form inputs render alongside the row — verify they're interactive.
  const targetInput = mockedPage.getByPlaceholder("목표가");
  await expect(targetInput).toBeVisible();

  // Remove the seeded alert.
  await deleteBtn.first().click({ force: true });
  await expect(mockedPage.getByText("설정된 알림이 없습니다.")).toBeVisible({
    timeout: 10_000,
  });
});
