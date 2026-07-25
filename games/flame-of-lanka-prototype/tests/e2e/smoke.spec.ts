import { expect, test } from "@playwright/test";

test("game boots, moves, and attacks without browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/?seed=108");
  await expect(page.locator("#game canvas")).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => window.__LANKA_STATE__.status)).toBe("playing");

  const startX = await page.evaluate(() => window.__LANKA_STATE__.player.x);
  await page.keyboard.down("d");
  await page.waitForTimeout(350);
  await page.keyboard.up("d");
  await expect.poll(() => page.evaluate(() => window.__LANKA_STATE__.player.x)).toBeGreaterThan(startX);

  await page.keyboard.press("j");
  await expect.poll(() => page.evaluate(() => window.__LANKA_STATE__.player.attackSerial)).toBe(1);
  expect(errors).toEqual([]);
});
