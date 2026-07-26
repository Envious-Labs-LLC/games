import { expect, test, type Page } from "@playwright/test";

async function waitForWindScene(page: Page): Promise<void> {
  await expect(page.locator("#game canvas")).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__WIND_STATE__?.status === "playing" &&
          window.__WIND_ENVIRONMENT_ART__?.texturesLoaded === true,
      ),
    )
    .toBe(true);
}

test("wind course boots and responds to movement abilities", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/?seed=205");
  await waitForWindScene(page);
  expect(errors).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__?.status))
    .toBe("playing");

  await page.keyboard.press("x");
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
  await page.keyboard.press("x");
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

test("Hanuman visibly cycles run, air, and gada attack poses", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/?seed=208");
  await waitForWindScene(page);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_HERO_POSE__))
    .toBe("idle");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_HERO_TEXTURE__))
    .toBe("hanuman-wind");

  const startingX = await page.evaluate(() => window.__WIND_STATE__.player.x);
  await page.keyboard.down("d");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__WIND_HERO_POSE_HISTORY__.includes("run-a") &&
          window.__WIND_HERO_POSE_HISTORY__.includes("run-mid") &&
          window.__WIND_HERO_POSE_HISTORY__.includes("run-b"),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__WIND_HERO_TEXTURE_HISTORY__.includes("hanuman-run-a") &&
          window.__WIND_HERO_TEXTURE_HISTORY__.includes("hanuman-run-mid") &&
          window.__WIND_HERO_TEXTURE_HISTORY__.includes("hanuman-run-b"),
      ),
    )
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.x))
    .toBeGreaterThan(startingX + 70);
  const runningRender = await page.evaluate(() => window.__WIND_HERO_RENDER__);
  expect(Number.isInteger(runningRender.x)).toBe(true);
  expect(Number.isInteger(runningRender.y)).toBe(true);
  expect(runningRender.rotation).toBe(0);
  expect(runningRender.displayWidth).toBeCloseTo(168, 5);
  expect(runningRender.displayHeight).toBeCloseTo(112, 5);
  await page.keyboard.up("d");

  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_HERO_POSE__))
    .toBe("air");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_HERO_TEXTURE__))
    .toBe("hanuman-air");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.onGround))
    .toBe(true);

  await page.evaluate(() => {
    window.__WIND_HERO_POSE_HISTORY__ = [];
    window.__WIND_HERO_TEXTURE_HISTORY__ = [];
  });
  await page.keyboard.press("z");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__WIND_HERO_POSE_HISTORY__.includes("attack-windup") &&
          window.__WIND_HERO_POSE_HISTORY__.includes("attack-impact"),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__WIND_HERO_TEXTURE_HISTORY__.includes(
            "hanuman-attack-windup",
          ) &&
          window.__WIND_HERO_TEXTURE_HISTORY__.includes(
            "hanuman-attack-impact",
          ),
      ),
    )
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.attackTimer))
    .toBe(0);

  expect(errors).toEqual([]);
});

test("living backdrop drifts independently of Hanuman", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/?seed=209");
  await waitForWindScene(page);

  const startingAtmosphere = await page.evaluate(
    () => window.__WIND_ATMOSPHERE__,
  );
  expect(startingAtmosphere.reducedMotion).toBe(false);
  expect(startingAtmosphere.hazeLayers).toBe(4);
  expect(startingAtmosphere.windWisps).toBe(6);
  expect(startingAtmosphere.windStrength).toBe(0.62);
  expect(await page.evaluate(() => window.__WIND_STATE__.started)).toBe(false);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_ATMOSPHERE__.autonomousTime))
    .toBeGreaterThan(startingAtmosphere.autonomousTime);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_ATMOSPHERE__.hazeDrift))
    .toBeGreaterThan(startingAtmosphere.hazeDrift);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_ATMOSPHERE__.windDrift))
    .toBeGreaterThan(startingAtmosphere.windDrift);

  await page.keyboard.down("d");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.started))
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() => window.__WIND_ATMOSPHERE__.backgroundOffsetX),
    )
    .toBeLessThan(-2);
  await page.keyboard.up("d");
  expect(
    await page.evaluate(() => window.__WIND_ATMOSPHERE__.windStrength),
  ).toBe(startingAtmosphere.windStrength);

  expect(errors).toEqual([]);
});

test("reduced motion keeps the living backdrop calm", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/?seed=210");
  await waitForWindScene(page);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_ATMOSPHERE__))
    .toMatchObject({
      reducedMotion: true,
      autonomousTime: 0,
      hazeDrift: 0,
      windDrift: 0,
      windStrength: 0,
      hazeLayers: 4,
      windWisps: 0,
    });

  const startingX = await page.evaluate(() => window.__WIND_STATE__.player.x);
  await page.keyboard.down("d");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.player.x))
    .toBeGreaterThan(startingX + 340);
  await expect
    .poll(() =>
      page.evaluate(() => window.__WIND_ATMOSPHERE__.backgroundOffsetX),
    )
    .toBeLessThan(-1);
  await page.keyboard.up("d");

  const movedAtmosphere = await page.evaluate(
    () => window.__WIND_ATMOSPHERE__,
  );
  expect(Math.abs(movedAtmosphere.backgroundOffsetX)).toBeLessThan(3);
  expect(Math.abs(movedAtmosphere.hazeOffsetX)).toBeLessThan(1);
  expect(movedAtmosphere.windStrength).toBe(0);

  expect(errors).toEqual([]);
});

test("painted foreground kit replaces the gray-box world art", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?seed=205");
  await waitForWindScene(page);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_ENVIRONMENT_ART__))
    .toMatchObject({
      paintedPlatforms: 14,
      platformFloorInset: 10,
      paintedBarriers: 2,
      paintedAnchors: 6,
      paintedShrine: true,
      texturesLoaded: true,
    });

  await page.evaluate(() => {
    const state = window.__WIND_STATE__;
    state.started = true;
    state.player.x = 850;
    state.player.y = 500;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = true;
  });
  await page.waitForTimeout(800);
  await expect(page.locator("#game canvas")).toHaveScreenshot(
    "painted-foreground-and-barrier.png",
    { maxDiffPixelRatio: 0.01 },
  );
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
  await waitForWindScene(page);
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
  await waitForWindScene(page);
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
  await page.keyboard.press("z");
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
  await waitForWindScene(page);
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
  const pausedState = await page.evaluate(() => ({
    tick: window.__WIND_STATE__.tick,
    atmosphereTime: window.__WIND_ATMOSPHERE__.autonomousTime,
  }));
  const stateAfterFrames = await page.evaluate(
    () =>
      new Promise<{ tick: number; atmosphereTime: number }>((resolve) => {
        let frames = 0;
        const advance = (): void => {
          frames += 1;
          if (frames >= 10) {
            resolve({
              tick: window.__WIND_STATE__.tick,
              atmosphereTime: window.__WIND_ATMOSPHERE__.autonomousTime,
            });
          }
          else requestAnimationFrame(advance);
        };
        requestAnimationFrame(advance);
      }),
  );
  expect(stateAfterFrames).toEqual(pausedState);

  await page.keyboard.press("Escape");
  await expect
    .poll(() => page.evaluate(() => window.__WIND_PAUSED__))
    .toBe(false);
  await expect
    .poll(() => page.evaluate(() => window.__WIND_STATE__.tick))
    .toBeGreaterThan(pausedState.tick);

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
