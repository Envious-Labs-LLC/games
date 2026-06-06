import { test, expect } from "@playwright/test";

test("game boots with a canvas and no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(page.locator("#game canvas")).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});
