import { expect, test } from "@playwright/test";

test("wind course boots and responds to movement abilities", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/?seed=205");
  await expect(page.locator("#game canvas")).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__?.status))
    .toBe("playing");

  const startingX = await page.evaluate(() => window.__WIND_STATE__.player.x);
  await page.keyboard.down("d");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.x))
    .toBeGreaterThan(startingX + 10);
  await page.keyboard.up("d");

  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.onGround))
    .toBe(false);

  await page.keyboard.press("Shift");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.dashAvailable))
    .toBe(false);
  expect(errors).toEqual([]);
});
