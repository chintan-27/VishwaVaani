import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("public preview is usable without an account or model call", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /world sounds different/i })).toBeVisible();
  await page.getByRole("link", { name: /30-second preview/i }).first().click();
  await expect(page.getByText(/no model call/i)).toBeVisible();
  await page.getByRole("button", { name: /simulate my answer/i }).click();
  await expect(page.getByRole("status")).toContainText(/understanding|guide|ready/i);
});

test("mission briefing switches between both locked modes", async ({ page }) => {
  await page.goto("/app/missions/us-immigration");
  await expect(page.getByRole("heading", { name: "US Immigration" })).toBeVisible();
  await page.getByText("Real-World Mode", { exact: true }).click();
  await expect(page.getByRole("link", { name: /(?:start|try scripted) real-world mode/i })).toBeVisible();
});

test("landing page has no automatically detectable serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(results.violations.filter((violation) => violation.impact === "serious")).toEqual([]);
});
