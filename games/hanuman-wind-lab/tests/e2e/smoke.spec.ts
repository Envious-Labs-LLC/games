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
  const capture = await page.evaluate(() =>
    JSON.parse(window.__WIND_EXPORT_CAPTURE__()),
  );
  expect(capture.version).toBe(1);
  expect(capture.seed).toBe(205);
  expect(capture.inputs.length).toBeGreaterThan(0);
  expect(capture.contentFingerprint.length).toBeGreaterThan(0);
  expect(JSON.parse(capture.finalStateJson).tick).toBe(
    capture.inputs.length,
  );

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

test("Wind evades a shadow wave and answers with a gada strike", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/?seed=206");
  await expect(page.locator("#game canvas")).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__?.status))
    .toBe("playing");
  await page.evaluate(() => {
    const state = window.__WIND_STATE__;
    const sentry = state.shadowSentries[0]!;
    state.started = true;
    state.player.x = sentry.x - 300;
    state.player.y = sentry.y;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = true;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__WIND_STATE__.shadowSentries[0]!.pulseCount,
      ),
    )
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.shadowWaves.length))
    .toBeGreaterThan(0);

  await page.keyboard.down("Space");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.onGround))
    .toBe(false);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = window.__WIND_STATE__;
        return state.shadowWaves.every(
          (wave) => wave.x < state.player.x - 60,
        );
      }),
    )
    .toBe(true);
  await page.keyboard.up("Space");
  expect(
    await page.evaluate(
      () => window.__WIND_STATE__.player.shadowWaveHitCount,
    ),
  ).toBe(0);

  await page.evaluate(() => {
    const state = window.__WIND_STATE__;
    const sentry = state.shadowSentries[0]!;
    state.player.x = sentry.x - 80;
    state.player.y = sentry.y;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = true;
    state.player.facing = 1;
  });
  await page.keyboard.press("j");
  await expect
    .poll(() =>
      page.evaluate(() => window.__WIND_STATE__.shadowSentries[0]!.defeated),
    )
    .toBe(true);
  expect(
    await page.evaluate(() => window.__WIND_STATE__.player.gadaDefeatCount),
  ).toBe(1);
  expect(errors).toEqual([]);
});

test("pause, blur, mute, and mouse attack behave in the real browser", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/?seed=207");
  const canvas = page.locator("#game canvas");
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__?.status))
    .toBe("playing");

  await page.keyboard.down("d");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.started))
    .toBe(true);
  await page.keyboard.up("d");

  await page.keyboard.press("Escape");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_PAUSED__))
    .toBe(true);
  const pausedTick = await page.evaluate(() => window.__WIND_STATE__.tick);
  const tickAfterFrames = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let frames = 0;
        const advance = (): void => {
          frames += 1;
          if (frames >= 10) resolve(window.__WIND_STATE__.tick);
          else requestAnimationFrame(advance);
        };
        requestAnimationFrame(advance);
      }),
  );
  expect(tickAfterFrames).toBe(pausedTick);

  await page.keyboard.press("Escape");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_PAUSED__))
    .toBe(false);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.tick))
    .toBeGreaterThan(pausedTick);

  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect
    .poll(() => page.evaluate(() => window.__WIND_PAUSED__))
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_PAUSED__))
    .toBe(false);

  await page.keyboard.press("m");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_MUTED__))
    .toBe(true);
  await page.keyboard.press("m");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_MUTED__))
    .toBe(false);

  await page.evaluate(() => {
    const state = window.__WIND_STATE__;
    const sentry = state.shadowSentries[0]!;
    state.player.x = sentry.x - 80;
    state.player.y = sentry.y;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = true;
    state.player.facing = 1;
  });
  await canvas.click({ position: { x: 480, y: 270 } });
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.attackCount))
    .toBe(1);
  await expect
    .poll(() =>
      page.evaluate(() => window.__WIND_STATE__.shadowSentries[0]!.defeated),
    )
    .toBe(true);

  expect(errors).toEqual([]);
});
