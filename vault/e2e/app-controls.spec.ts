import { expect, test } from "@playwright/test";

test("browser: starter opens as a neutral Toolcraft shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(page.getByRole("application", { name: "Canvas viewport" })).toBeVisible();

  await expect(page.getByText("Toolcraft App Template Controls")).toHaveCount(0);
  await expect(page.getByText("Generation")).toHaveCount(0);
  await expect(page.getByText("Prompt")).toHaveCount(0);
  await expect(page.getByText("Dur:")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Play playback|Pause playback/ })).toHaveCount(0);
});

test("browser: product canvas does not expose media upload controls", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(page.locator("[data-prototype-screen]")).toBeVisible();
  await expect(page.getByRole("img", { name: "starter-fixture.svg" })).toHaveCount(0);
  await expect(page.getByText("Prompt")).toHaveCount(0);
});
