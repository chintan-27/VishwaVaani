import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function signInAndOnboard(page: Page) {
  await page.goto("/sign-in");
  const email = `learner-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: /email me a sign-in code/i }).click();
  const devCodeText = await page.getByText(/local development code:/i).textContent();
  const code = devCodeText?.match(/\d{6}/)?.[0];
  expect(code).toBeTruthy();
  await page.getByLabel("Six-digit code").fill(code!);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /test microphone/i }).click();
  await expect(page.getByText(/clear signal detected/i)).toBeVisible();
  await page.getByRole("button", { name: /enter vishwavaani/i }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test("public preview is usable without an account or model call", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /world sounds different/i })).toBeVisible();
  await page.getByRole("link", { name: /30-second preview/i }).first().click();
  await expect(page.getByText(/no model call/i)).toBeVisible();
  await page.getByRole("button", { name: /simulate my answer/i }).click();
  await expect(page.getByRole("status")).toContainText(/understanding|guide|ready/i);
});

test("mission briefing switches between both locked modes", async ({ page }) => {
  await signInAndOnboard(page);
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
