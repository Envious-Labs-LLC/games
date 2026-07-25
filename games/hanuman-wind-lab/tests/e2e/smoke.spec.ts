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

  await page.keyboard.press("q");
  await expect
    .poll(() =>
      page.evaluate(() => window.__WIND_STATE__.player.anchorUseCount),
    )
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.onGround))
    .toBe(true);

  const startingX = await page.evaluate(() => window.__WIND_STATE__.player.x);
  await page.keyboard.down("d");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.x))
    .toBeGreaterThan(startingX + 10);
  await page.keyboard.up("d");

  await page.keyboard.press("Shift");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.dashCount))
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.dashTimer))
    .toBe(0);

  await page.keyboard.press("r");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.seed))
    .toBe(206);
  await page.keyboard.press("e");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.form))
    .toBe("mountain");
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.onGround))
    .toBe(false);
  await page.keyboard.press("q");
  await expect
    .poll(() =>
      page.evaluate(() => window.__WIND_STATE__.player.earthSlamStartCount),
    )
    .toBe(1);
  await expect
    .poll(() =>
      page.evaluate(() => window.__WIND_STATE__.player.earthSlamImpactCount),
    )
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.onGround))
    .toBe(true);

  await page.keyboard.press("e");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.form))
    .toBe("wind");

  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.onGround))
    .toBe(false);

  await page.keyboard.press("Shift");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.dashCount))
    .toBe(1);
  expect(errors).toEqual([]);
});

test("shadow sentry renders nearby and yields to Mountain dash", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/?seed=205");
  await expect(page.locator("#game canvas")).toBeVisible({ timeout: 15_000 });
  const stagedTick = await page.evaluate(() => {
    const state = window.__WIND_STATE__;
    const sentry = state.shadowSentries[0]!;
    state.started = true;
    state.player.x = sentry.x - 100;
    state.player.y = sentry.y;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = true;
    return state.tick;
  });
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.tick))
    .toBeGreaterThanOrEqual(stagedTick + 15);
  expect(
    await page.evaluate(
      () =>
        Math.abs(
          window.__WIND_STATE__.shadowSentries[0]!.x -
            window.__WIND_STATE__.player.x,
        ) <= 220,
    ),
  ).toBe(true);

  await page.keyboard.press("e");
  await page.keyboard.down("d");
  await page.keyboard.press("Shift");
  await expect
    .poll(() =>
      page.evaluate(() => window.__WIND_STATE__.shadowSentries[0]!.defeated),
    )
    .toBe(true);
  await page.keyboard.up("d");
  expect(
    await page.evaluate(
      () => window.__WIND_STATE__.player.sentryDashDefeatCount,
    ),
  ).toBe(1);
  expect(errors).toEqual([]);
});
