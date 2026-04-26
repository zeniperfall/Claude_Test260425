import { test, expect } from "./fixtures";

test("Feature 5: earnings tab shows analyst targets and quarterly history", async ({
  mockedPage,
}) => {
  await mockedPage.goto("/");
  await mockedPage.waitForSelector("text=Apple Inc.", { timeout: 15_000 });

  await mockedPage.getByRole("button", { name: "실적" }).click();

  await expect(mockedPage.getByText("애널리스트 컨센서스")).toBeVisible();
  await expect(mockedPage.getByText("평균 목표가")).toBeVisible();
  await expect(mockedPage.getByText("다음 실적 발표")).toBeVisible();
  await expect(mockedPage.getByText(/분기 실적/)).toBeVisible();

  // At least one quarterly row from the mock
  await expect(mockedPage.getByText("2025-09-30")).toBeVisible();
});
