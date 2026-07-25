import { describe, expect, it } from "vitest";
import {
  createGame,
  EARTH_SLAM_SHOCKWAVE_RADIUS,
  emptyInput,
  findUsableWindAnchorIndex,
  step,
  FIXED_DT,
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  type GameState,
  type Input,
} from "../../src/sim/index";

function runTicks(state: GameState, input: Input, ticks: number): GameState {
  let current = state;
  for (let index = 0; index < ticks; index += 1) {
    current = step(current, input, FIXED_DT);
  }
  return current;
}

describe("Hanuman Wind Lab movement", () => {
  it("repeats exactly with the same seed and input stream", () => {
    const run = (): GameState => {
      let state = createGame(205);
      for (let tick = 0; tick < 900; tick += 1) {
        state = step(
          state,
          {
            moveX: tick < 780 ? 1 : -1,
            jumpPressed: tick % 95 === 0,
            jumpHeld: tick % 95 < 28,
            dashPressed: tick % 127 === 40,
            formPressed: tick % 211 === 80,
            powerPressed: tick % 173 === 60,
            restart: false,
          },
          FIXED_DT,
        );
      }
      return state;
    };
    expect(run()).toEqual(run());
  });

  it("repeats exactly when the input stream activates a wind anchor", () => {
    const run = (): GameState => {
      let state = createGame(60);
      state.player.facing = -1;
      state = step(
        state,
        { ...emptyInput(), powerPressed: true },
        FIXED_DT,
      );
      return runTicks(state, emptyInput(), 90);
    };

    const first = run();
    expect(first.player.anchorUseCount).toBe(1);
    expect(run()).toEqual(first);
  });

  it("repeats exactly when the input stream completes an earth-slam", () => {
    const run = (): GameState => {
      let state = createGame(73);
      state.player.form = "mountain";
      state.player.x = 1060;
      state.player.y = 350;
      state.player.onGround = false;
      state = step(
        state,
        { ...emptyInput(), powerPressed: true },
        FIXED_DT,
      );
      return runTicks(state, emptyInput(), 30);
    };

    const first = run();
    expect(first.player.earthSlamStartCount).toBe(1);
    expect(first.player.earthSlamImpactCount).toBe(1);
    expect(run()).toEqual(first);
  });

  it("jumps immediately and holding Space creates a higher leap", () => {
    let tapped = createGame(1);
    let held = createGame(1);
    tapped = step(tapped, { ...emptyInput(), jumpPressed: true }, FIXED_DT);
    held = step(
      held,
      { ...emptyInput(), jumpPressed: true, jumpHeld: true },
      FIXED_DT,
    );
    expect(tapped.player.y).toBeLessThan(500);

    tapped = runTicks(tapped, emptyInput(), 10);
    held = runTicks(held, { ...emptyInput(), jumpHeld: true }, 10);
    expect(held.player.y).toBeLessThan(tapped.player.y);
  });

  it("buffers a jump just before landing", () => {
    let state = createGame(2);
    state.started = true;
    state.player.y = 450;
    state.player.vy = 420;
    state.player.onGround = false;
    state.player.coyoteTimer = 0;
    state = step(state, { ...emptyInput(), jumpPressed: true }, FIXED_DT);
    state = runTicks(state, emptyInput(), 20);
    expect(state.player.vy).toBeLessThan(0);
  });

  it("air dashes once and regains the dash after landing", () => {
    let state = createGame(3);
    state = step(
      state,
      { ...emptyInput(), jumpPressed: true, jumpHeld: true },
      FIXED_DT,
    );
    state = step(state, { ...emptyInput(), dashPressed: true }, FIXED_DT);
    expect(state.player.dashAvailable).toBe(false);
    expect(Math.abs(state.player.vx)).toBeGreaterThan(600);

    state = runTicks(state, emptyInput(), 180);
    expect(state.player.onGround).toBe(true);
    expect(state.player.dashAvailable).toBe(true);
  });

  it("dashes immediately while on the ground", () => {
    let state = createGame(30);
    state = step(state, { ...emptyInput(), dashPressed: true }, FIXED_DT);
    expect(state.player.dashCount).toBe(1);
    expect(state.player.dashTimer).toBeGreaterThan(0);
    expect(Math.abs(state.player.vx)).toBeGreaterThan(600);
    expect(state.player.onGround).toBe(true);
  });

  it("can jump out of a ground dash", () => {
    let state = createGame(31);
    state = step(state, { ...emptyInput(), dashPressed: true }, FIXED_DT);
    state = step(
      state,
      { ...emptyInput(), jumpPressed: true, jumpHeld: true },
      FIXED_DT,
    );
    expect(state.player.onGround).toBe(false);
    expect(state.player.vy).toBeLessThan(0);
    expect(state.player.dashTimer).toBe(0);
  });

  it("shifts between wind and mountain forms", () => {
    let state = createGame(32);
    state = step(state, { ...emptyInput(), formPressed: true }, FIXED_DT);
    expect(state.player.form).toBe("mountain");
    expect(state.player.formShiftCount).toBe(1);
    state = step(state, { ...emptyInput(), formPressed: true }, FIXED_DT);
    expect(state.player.form).toBe("wind");
    expect(state.player.formShiftCount).toBe(2);
  });

  it("keeps an active dash when changing form", () => {
    let state = createGame(35);
    state = step(state, { ...emptyInput(), dashPressed: true }, FIXED_DT);
    state = step(state, { ...emptyInput(), formPressed: true }, FIXED_DT);
    expect(state.player.form).toBe("mountain");
    expect(state.player.dashTimer).toBeGreaterThan(0);
  });

  it("gives Mountain Form distinct movement weight", () => {
    let windRun = createGame(36);
    let mountainRun = createGame(36);
    mountainRun.player.form = "mountain";
    windRun = runTicks(windRun, { ...emptyInput(), moveX: 1 }, 30);
    mountainRun = runTicks(
      mountainRun,
      { ...emptyInput(), moveX: 1 },
      30,
    );
    expect(mountainRun.player.vx).toBeLessThan(windRun.player.vx);

    let windJump = createGame(37);
    let mountainJump = createGame(37);
    mountainJump.player.form = "mountain";
    windJump = step(
      windJump,
      { ...emptyInput(), jumpPressed: true },
      FIXED_DT,
    );
    mountainJump = step(
      mountainJump,
      { ...emptyInput(), jumpPressed: true },
      FIXED_DT,
    );
    expect(mountainJump.player.vy).toBeGreaterThan(windJump.player.vy);

    let windFall = createGame(38);
    let mountainFall = createGame(38);
    for (const state of [windFall, mountainFall]) {
      state.started = true;
      state.player.y = 400;
      state.player.vy = 100;
      state.player.onGround = false;
      state.player.coyoteTimer = 0;
    }
    mountainFall.player.form = "mountain";
    windFall = step(windFall, emptyInput(), FIXED_DT);
    mountainFall = step(mountainFall, emptyInput(), FIXED_DT);
    expect(mountainFall.player.vy).toBeGreaterThan(windFall.player.vy);

    let windDash = createGame(39);
    let mountainDash = createGame(39);
    mountainDash.player.form = "mountain";
    windDash = step(
      windDash,
      { ...emptyInput(), dashPressed: true },
      FIXED_DT,
    );
    mountainDash = step(
      mountainDash,
      { ...emptyInput(), dashPressed: true },
      FIXED_DT,
    );
    expect(Math.abs(mountainDash.player.vx)).toBeGreaterThan(
      Math.abs(windDash.player.vx),
    );
  });

  it("allows Mountain Form to dash in the air", () => {
    let state = createGame(40);
    state.player.form = "mountain";
    state.player.y = 400;
    state.player.onGround = false;
    state.player.dashAvailable = true;
    state = step(state, { ...emptyInput(), dashPressed: true }, FIXED_DT);
    expect(state.player.dashCount).toBe(1);
    expect(state.player.dashTimer).toBeGreaterThan(0);
    expect(state.player.dashAvailable).toBe(false);
    expect(Math.abs(state.player.vx)).toBeGreaterThan(760);
  });

  it("reserves gliding for Wind Form", () => {
    let windState = createGame(45);
    let mountainState = createGame(45);
    for (const state of [windState, mountainState]) {
      state.started = true;
      state.player.y = 400;
      state.player.vy = 100;
      state.player.onGround = false;
      state.player.coyoteTimer = 0;
    }
    mountainState.player.form = "mountain";
    windState = step(
      windState,
      { ...emptyInput(), jumpHeld: true },
      FIXED_DT,
    );
    mountainState = step(
      mountainState,
      { ...emptyInput(), jumpHeld: true },
      FIXED_DT,
    );
    expect(windState.player.gliding).toBe(true);
    expect(mountainState.player.gliding).toBe(false);
    expect(mountainState.player.vy).toBeGreaterThan(windState.player.vy);
  });

  it("makes Mountain Form wall-slide faster than Wind Form", () => {
    const wallSlideSpeed = (
      form: GameState["player"]["form"],
      seed: number,
    ): number => {
      let state = createGame(seed);
      const wall = state.platforms.find(
        (platform) => platform.height > 200,
      )!;
      state.started = true;
      state.player.form = form;
      state.player.x = wall.x - PLAYER_HALF_WIDTH - 1;
      state.player.y = wall.y + wall.height - 80;
      state.player.vx = 200;
      state.player.vy = 300;
      state.player.onGround = false;
      state.player.coyoteTimer = 0;
      state = step(state, emptyInput(), FIXED_DT);
      expect(state.player.wallSide).toBe(1);
      return state.player.vy;
    };
    expect(wallSlideSpeed("mountain", 47)).toBeGreaterThan(
      wallSlideSpeed("wind", 46),
    );
  });

  it("starts a committed Mountain earth-slam while airborne", () => {
    let state = createGame(62);
    state.player.form = "mountain";
    state.player.y = 350;
    state.player.vx = 240;
    state.player.vy = -200;
    state.player.onGround = false;
    state = step(
      state,
      {
        ...emptyInput(),
        powerPressed: true,
        dashPressed: true,
        jumpPressed: true,
      },
      FIXED_DT,
    );

    expect(state.player.earthSlamming).toBe(true);
    expect(state.player.earthSlamStartCount).toBe(1);
    expect(state.player.earthSlamImpactCount).toBe(0);
    expect(state.player.vx).toBe(0);
    expect(state.player.vy).toBeGreaterThan(1000);
    expect(state.player.dashCount).toBe(0);
    expect(state.player.jumpBufferTimer).toBe(0);
    expect(state.bursts.filter((burst) => burst.kind === "slam")).toHaveLength(1);
  });

  it("keeps the earth-slam committed until a single landing impact", () => {
    let state = createGame(63);
    state.player.form = "mountain";
    state.player.x = 1060;
    state.player.y = 350;
    state.player.onGround = false;
    state = step(
      state,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );
    state = step(
      state,
      {
        ...emptyInput(),
        moveX: -1,
        formPressed: true,
        powerPressed: true,
        dashPressed: true,
        jumpPressed: true,
      },
      FIXED_DT,
    );

    expect(state.player.form).toBe("mountain");
    expect(state.player.facing).toBe(1);
    expect(state.player.earthSlamming).toBe(true);
    expect(state.player.earthSlamStartCount).toBe(1);
    expect(state.player.dashCount).toBe(0);
    expect(state.player.jumpBufferTimer).toBe(0);

    state = runTicks(state, emptyInput(), 20);
    expect(state.player.onGround).toBe(true);
    expect(state.player.earthSlamming).toBe(false);
    expect(state.player.earthSlamStartCount).toBe(1);
    expect(state.player.earthSlamImpactCount).toBe(1);
    expect(
      state.bursts.filter((burst) => burst.kind === "shockwave"),
    ).toHaveLength(1);

    state = step(
      state,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );
    expect(state.player.earthSlamStartCount).toBe(1);
    expect(state.player.earthSlamImpactCount).toBe(1);
  });

  it("shatters cracked stone at the earth-slam shockwave boundary", () => {
    let state = createGame(75);
    const seal = state.seals[0]!;
    state.player.form = "mountain";
    state.player.x = seal.x - EARTH_SLAM_SHOCKWAVE_RADIUS;
    state.player.y = 340;
    state.player.onGround = false;
    state = step(
      state,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );
    state = runTicks(state, emptyInput(), 4);

    expect(state.player.earthSlamImpactCount).toBe(1);
    expect(state.player.earthSlamSealBreakCount).toBe(1);
    expect(seal.broken).toBe(true);
    expect(
      state.bursts.filter((burst) => burst.kind === "break"),
    ).toHaveLength(1);
    expect(
      state.bursts.filter((burst) => burst.kind === "shockwave"),
    ).toHaveLength(1);
  });

  it("leaves cracked stone intact outside the earth-slam shockwave", () => {
    let state = createGame(76);
    const seal = state.seals[0]!;
    state.player.form = "mountain";
    state.player.x =
      seal.x - EARTH_SLAM_SHOCKWAVE_RADIUS - 1;
    state.player.y = 340;
    state.player.onGround = false;
    state = step(
      state,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );
    state = runTicks(state, emptyInput(), 4);

    expect(state.player.earthSlamImpactCount).toBe(1);
    expect(state.player.earthSlamSealBreakCount).toBe(0);
    expect(seal.broken).toBe(false);
    expect(
      state.bursts.filter((burst) => burst.kind === "break"),
    ).toHaveLength(0);
  });

  it("does not count already-shattered stone twice", () => {
    let state = createGame(77);
    const seal = state.seals[0]!;
    seal.broken = true;
    state.player.form = "mountain";
    state.player.x = seal.x;
    state.player.y = 340;
    state.player.onGround = false;
    state = step(
      state,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );
    state = runTicks(state, emptyInput(), 12);

    expect(state.player.earthSlamImpactCount).toBe(1);
    expect(state.player.earthSlamSealBreakCount).toBe(0);
    expect(
      state.bursts.filter((burst) => burst.kind === "break"),
    ).toHaveLength(0);
  });

  it("uses an earth-slam for one seal and a dash for the other", () => {
    let state = createGame(78);
    const firstSeal = state.seals[0]!;
    const secondSeal = state.seals[1]!;
    state.player.form = "mountain";
    state.player.x = firstSeal.x - EARTH_SLAM_SHOCKWAVE_RADIUS;
    state.player.y = 340;
    state.player.onGround = false;
    state = step(
      state,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );
    state = runTicks(state, emptyInput(), 4);

    expect(firstSeal.broken).toBe(true);
    expect(secondSeal.broken).toBe(false);
    expect(state.player.earthSlamSealBreakCount).toBe(1);

    state.player.form = "mountain";
    state.player.facing = 1;
    state.player.x = secondSeal.x - PLAYER_HALF_WIDTH - 1;
    state.player.y = 500;
    state.player.onGround = true;
    state.player.dashAvailable = true;
    state.player.dashTimer = 0;
    state = step(
      state,
      { ...emptyInput(), dashPressed: true },
      FIXED_DT,
    );

    expect(secondSeal.broken).toBe(true);
    expect(state.seals.filter((seal) => seal.broken)).toHaveLength(2);
    expect(state.player.earthSlamSealBreakCount).toBe(1);
  });

  it("lets grounded Mountain power attempts fall through to jump or dash", () => {
    let dashState = createGame(64);
    dashState.player.form = "mountain";
    dashState = step(
      dashState,
      { ...emptyInput(), powerPressed: true, dashPressed: true },
      FIXED_DT,
    );
    expect(dashState.player.earthSlamStartCount).toBe(0);
    expect(dashState.player.dashCount).toBe(1);

    let jumpState = createGame(65);
    jumpState.player.form = "mountain";
    jumpState = step(
      jumpState,
      { ...emptyInput(), powerPressed: true, jumpPressed: true },
      FIXED_DT,
    );
    expect(jumpState.player.earthSlamStartCount).toBe(0);
    expect(jumpState.player.onGround).toBe(false);
    expect(jumpState.player.vy).toBeLessThan(0);
  });

  it("cancels an active Mountain air dash into an earth-slam", () => {
    let state = createGame(66);
    state.player.form = "mountain";
    state.player.y = 350;
    state.player.onGround = false;
    state = step(
      state,
      { ...emptyInput(), dashPressed: true },
      FIXED_DT,
    );
    expect(state.player.dashTimer).toBeGreaterThan(0);

    state = step(
      state,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );
    expect(state.player.earthSlamming).toBe(true);
    expect(state.player.dashTimer).toBe(0);
    expect(state.player.vx).toBe(0);
    expect(state.player.vy).toBeGreaterThan(1000);
  });

  it("clears an earth-slam on a fall without creating an impact", () => {
    let state = createGame(67);
    state.platforms = [];
    state.seals = [];
    state.player.form = "mountain";
    state.player.x = 700;
    state.player.y = state.worldHeight - 5;
    state.player.onGround = false;
    state = step(
      state,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );

    expect(state.falls).toBe(1);
    expect(state.player.earthSlamming).toBe(false);
    expect(state.player.earthSlamStartCount).toBe(1);
    expect(state.player.earthSlamImpactCount).toBe(0);
    expect(
      state.bursts.filter((burst) => burst.kind === "shockwave"),
    ).toHaveLength(0);
  });

  it("resets an active earth-slam on restart", () => {
    let state = createGame(71);
    state.player.form = "mountain";
    state.player.y = 350;
    state.player.onGround = false;
    state = step(
      state,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );
    expect(state.player.earthSlamming).toBe(true);

    state = step(state, { ...emptyInput(), restart: true }, FIXED_DT);
    expect(state.seed).toBe(72);
    expect(state.player.earthSlamming).toBe(false);
    expect(state.player.earthSlamStartCount).toBe(0);
    expect(state.player.earthSlamImpactCount).toBe(0);
  });

  it("lets a failed Wind power attempt fall through to an air dash", () => {
    let state = createGame(72);
    state.player.x = 3500;
    state.player.y = 350;
    state.player.onGround = false;
    state = step(
      state,
      { ...emptyInput(), powerPressed: true, dashPressed: true },
      FIXED_DT,
    );

    expect(state.player.anchorUseCount).toBe(0);
    expect(state.player.earthSlamStartCount).toBe(0);
    expect(state.player.dashCount).toBe(1);
    expect(state.player.dashTimer).toBeGreaterThan(0);
  });

  it("does not create a shockwave on an ordinary Mountain landing", () => {
    let state = createGame(68);
    state.started = true;
    state.player.form = "mountain";
    state.player.x = 900;
    state.player.y = 480;
    state.player.vy = 300;
    state.player.onGround = false;
    state = runTicks(state, emptyInput(), 6);

    expect(state.player.onGround).toBe(true);
    expect(state.player.earthSlamImpactCount).toBe(0);
    expect(state.player.earthSlamSealBreakCount).toBe(0);
    expect(
      state.bursts.filter((burst) => burst.kind === "shockwave"),
    ).toHaveLength(0);
  });

  it("finishes only after an earth-slam lands at the shrine", () => {
    let state = createGame(74);
    for (const sigil of state.sigils) sigil.collected = true;
    state.player.form = "mountain";
    state.player.x = state.finish.x;
    state.player.y = 350;
    state.player.onGround = false;
    state = step(
      state,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );

    expect(state.status).toBe("playing");
    expect(state.player.earthSlamming).toBe(true);
    expect(state.player.earthSlamImpactCount).toBe(0);

    state = runTicks(state, emptyInput(), 20);
    expect(state.status).toBe("won");
    expect(state.player.onGround).toBe(true);
    expect(state.player.earthSlamming).toBe(false);
    expect(state.player.earthSlamStartCount).toBe(1);
    expect(state.player.earthSlamImpactCount).toBe(1);

    const wonState = structuredClone(state);
    state = step(
      state,
      {
        ...emptyInput(),
        formPressed: true,
        powerPressed: true,
        dashPressed: true,
        jumpPressed: true,
      },
      FIXED_DT,
    );
    expect(state.player).toEqual(wonState.player);
    expect(state.statusTimer).toBeGreaterThan(wonState.statusTimer);
  });

  it("launches from a nearby wind anchor toward movement input", () => {
    let state = createGame(52);
    state = step(
      state,
      { ...emptyInput(), moveX: 1, powerPressed: true },
      FIXED_DT,
    );
    expect(state.player.anchorUseCount).toBe(1);
    expect(state.player.vx).toBeGreaterThan(500);
    expect(state.player.vy).toBeLessThan(-600);
    expect(state.player.onGround).toBe(false);
    expect(state.player.dashAvailable).toBe(true);

    let leftState = createGame(53);
    leftState = step(
      leftState,
      { ...emptyInput(), moveX: -1, powerPressed: true },
      FIXED_DT,
    );
    expect(leftState.player.anchorUseCount).toBe(1);
    expect(leftState.player.vx).toBeLessThan(-500);
    expect(leftState.player.facing).toBe(-1);
  });

  it("chains a wind vault directly into an air dash", () => {
    let state = createGame(54);
    state = step(
      state,
      { ...emptyInput(), moveX: 1, powerPressed: true },
      FIXED_DT,
    );
    state = step(
      state,
      { ...emptyInput(), dashPressed: true },
      FIXED_DT,
    );
    expect(state.player.anchorUseCount).toBe(1);
    expect(state.player.dashCount).toBe(1);
    expect(state.player.dashAvailable).toBe(false);
  });

  it("requires Wind Form, anchor range, and cooldown for a wind vault", () => {
    let mountainState = createGame(55);
    mountainState.player.form = "mountain";
    mountainState = step(
      mountainState,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );
    expect(mountainState.player.anchorUseCount).toBe(0);

    let farState = createGame(56);
    farState.player.x = 3500;
    farState = step(
      farState,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );
    expect(farState.player.anchorUseCount).toBe(0);

    let cooldownState = createGame(57);
    cooldownState = step(
      cooldownState,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );
    cooldownState = step(
      cooldownState,
      { ...emptyInput(), powerPressed: true },
      FIXED_DT,
    );
    expect(cooldownState.player.anchorUseCount).toBe(1);
  });

  it("uses E plus Q for form change only in either direction", () => {
    let mountainState = createGame(69);
    mountainState.player.form = "mountain";
    mountainState.player.y = 350;
    mountainState.player.onGround = false;
    mountainState = step(
      mountainState,
      { ...emptyInput(), formPressed: true, powerPressed: true },
      FIXED_DT,
    );
    expect(mountainState.player.form).toBe("wind");
    expect(mountainState.player.anchorUseCount).toBe(0);
    expect(mountainState.player.earthSlamStartCount).toBe(0);

    let windState = createGame(70);
    windState = step(
      windState,
      { ...emptyInput(), formPressed: true, powerPressed: true },
      FIXED_DT,
    );
    expect(windState.player.form).toBe("mountain");
    expect(windState.player.anchorUseCount).toBe(0);
    expect(windState.player.earthSlamStartCount).toBe(0);
  });

  it("activates later anchors while airborne and becomes ready after cooldown", () => {
    let state = createGame(58);
    const laterAnchor = state.windAnchors[3]!;
    state.player.x = laterAnchor.x;
    state.player.y = laterAnchor.y + PLAYER_HEIGHT * 0.5;
    state.player.onGround = false;
    state.player.vy = 180;

    expect(findUsableWindAnchorIndex(state)).toBe(3);
    state = step(
      state,
      { ...emptyInput(), moveX: -1, powerPressed: true },
      FIXED_DT,
    );
    expect(state.player.usedWindAnchorIndices).toEqual([3]);
    expect(findUsableWindAnchorIndex(state)).toBeNull();

    state = runTicks(state, emptyInput(), 30);
    state.player.x = laterAnchor.x;
    state.player.y = laterAnchor.y + PLAYER_HEIGHT * 0.5;
    state.player.onGround = false;
    expect(findUsableWindAnchorIndex(state)).toBe(3);

    state = step(
      state,
      { ...emptyInput(), moveX: 1, powerPressed: true },
      FIXED_DT,
    );
    expect(state.player.anchorUseCount).toBe(2);
    expect(state.player.usedWindAnchorIndices).toEqual([3]);
  });

  it("supports every configured wind anchor", () => {
    let state = createGame(59);

    for (let index = 0; index < state.windAnchors.length; index += 1) {
      const anchor = state.windAnchors[index]!;
      state.player.x = anchor.x;
      state.player.y = anchor.y + PLAYER_HEIGHT * 0.5;
      state.player.onGround = false;
      state.player.anchorCooldown = 0;
      expect(findUsableWindAnchorIndex(state)).toBe(index);
      state = step(
        state,
        { ...emptyInput(), moveX: 1, powerPressed: true },
        FIXED_DT,
      );
    }

    expect(state.player.anchorUseCount).toBe(state.windAnchors.length);
    expect(state.player.usedWindAnchorIndices).toEqual(
      state.windAnchors.map((_, index) => index),
    );
  });

  it("blocks ordinary movement and Wind Form dashes at cracked seals", () => {
    const windState = createGame(33);
    const windSeal = windState.seals[0]!;
    windState.player.x = windSeal.x - 16;
    windState.player.y = 500;
    windState.player.onGround = true;
    step(windState, { ...emptyInput(), dashPressed: true }, FIXED_DT);
    expect(windSeal.broken).toBe(false);
    expect(windState.player.x).toBe(windSeal.x - 15);

    const rightWindState = createGame(48);
    const rightWindSeal = rightWindState.seals[0]!;
    rightWindState.player.facing = -1;
    rightWindState.player.x =
      rightWindSeal.x + rightWindSeal.width + 16;
    rightWindState.player.y = 500;
    rightWindState.player.onGround = true;
    step(
      rightWindState,
      { ...emptyInput(), dashPressed: true },
      FIXED_DT,
    );
    expect(rightWindSeal.broken).toBe(false);
    expect(rightWindState.player.x).toBe(
      rightWindSeal.x + rightWindSeal.width + PLAYER_HALF_WIDTH,
    );

    let mountainWalk = createGame(34);
    const walkSeal = mountainWalk.seals[0]!;
    mountainWalk.player.form = "mountain";
    mountainWalk.player.x = walkSeal.x - 16;
    mountainWalk.player.y = 500;
    mountainWalk.player.onGround = true;
    mountainWalk = runTicks(
      mountainWalk,
      { ...emptyInput(), moveX: 1 },
      10,
    );
    expect(walkSeal.broken).toBe(false);
    expect(mountainWalk.player.x).toBe(walkSeal.x - PLAYER_HALF_WIDTH);
  });

  it("breaks cracked seals with Mountain dashes from either direction or in air", () => {
    const mountainState = createGame(34);
    const mountainSeal = mountainState.seals[0]!;
    mountainState.player.x = mountainSeal.x - 16;
    mountainState.player.y = 500;
    mountainState.player.onGround = true;
    mountainState.player.form = "mountain";
    step(mountainState, { ...emptyInput(), dashPressed: true }, FIXED_DT);
    expect(mountainSeal.broken).toBe(true);
    expect(mountainState.player.earthSlamSealBreakCount).toBe(0);
    expect(mountainState.player.x).toBeGreaterThan(mountainSeal.x - 16);

    const rightState = createGame(41);
    const rightSeal = rightState.seals[0]!;
    rightState.player.form = "mountain";
    rightState.player.facing = -1;
    rightState.player.x = rightSeal.x + rightSeal.width + 16;
    rightState.player.y = 500;
    rightState.player.onGround = true;
    step(rightState, { ...emptyInput(), dashPressed: true }, FIXED_DT);
    expect(rightSeal.broken).toBe(true);

    const airState = createGame(42);
    const airSeal = airState.seals[0]!;
    airState.player.form = "mountain";
    airState.player.x = airSeal.x - 16;
    airState.player.y = 420;
    airState.player.onGround = false;
    step(airState, { ...emptyInput(), dashPressed: true }, FIXED_DT);
    expect(airSeal.broken).toBe(true);
  });

  it("breaks a seal on the final movement step of a Mountain dash", () => {
    let state = createGame(43);
    const seal = state.seals[0]!;
    state.player.form = "mountain";
    state.player.x =
      seal.x -
      PLAYER_HALF_WIDTH -
      8 * 840 * FIXED_DT -
      1;
    state.player.y = 500;
    state.player.onGround = true;
    state = step(state, { ...emptyInput(), dashPressed: true }, FIXED_DT);
    state = runTicks(state, emptyInput(), 8);
    expect(state.player.dashTimer).toBe(0);
    expect(seal.broken).toBe(true);
  });

  it("treats an unbroken seal as solid from above", () => {
    let state = createGame(44);
    const seal = state.seals[0]!;
    state.started = true;
    state.player.x = seal.x + seal.width * 0.5;
    state.player.y = seal.y - 20;
    state.player.vy = 300;
    state.player.onGround = false;
    state = runTicks(state, emptyInput(), 20);
    expect(seal.broken).toBe(false);
    expect(state.player.y).toBe(seal.y);
  });

  it("treats an unbroken seal as solid from below", () => {
    let state = createGame(50);
    const seal = state.seals[0]!;
    state.started = true;
    state.platforms = [];
    state.player.x = seal.x + seal.width * 0.5;
    state.player.y = seal.y + seal.height + PLAYER_HEIGHT + 1;
    state.player.vy = -300;
    state.player.onGround = false;
    state = step(state, emptyInput(), FIXED_DT);
    expect(seal.broken).toBe(false);
    expect(state.player.y).toBe(
      seal.y + seal.height + PLAYER_HEIGHT,
    );
    expect(state.player.vy).toBe(0);
  });

  it("removes vertical and horizontal collision after a seal breaks", () => {
    let verticalState = createGame(49);
    const verticalSeal = verticalState.seals[0]!;
    verticalSeal.broken = true;
    verticalState.started = true;
    verticalState.player.x =
      verticalSeal.x + verticalSeal.width * 0.5;
    verticalState.player.y = verticalSeal.y - 20;
    verticalState.player.vy = 300;
    verticalState.player.onGround = false;
    verticalState = runTicks(verticalState, emptyInput(), 20);
    expect(verticalState.player.y).toBeGreaterThan(verticalSeal.y);

    let horizontalState = createGame(51);
    const horizontalSeal = horizontalState.seals[0]!;
    horizontalSeal.broken = true;
    horizontalState.started = true;
    horizontalState.player.x =
      horizontalSeal.x - PLAYER_HALF_WIDTH - 1;
    horizontalState.player.y = 500;
    horizontalState.player.vx = 300;
    horizontalState.player.onGround = true;
    horizontalState = step(horizontalState, emptyInput(), FIXED_DT);
    expect(horizontalState.player.x).toBeGreaterThan(
      horizontalSeal.x - PLAYER_HALF_WIDTH,
    );
  });

  it("collects wind sigils and activates the finish shrine", () => {
    let state = createGame(4);
    state.started = true;
    for (const sigil of state.sigils) sigil.collected = true;
    state.player.x = state.finish.x;
    state.player.y = state.finish.y;
    state = step(state, emptyInput(), FIXED_DT);
    expect(state.status).toBe("won");
  });

  it("returns safely to the latest checkpoint after a fall", () => {
    let state = createGame(5);
    state.started = true;
    state.checkpoint = { x: 925, y: 360 };
    state.player.y = state.worldHeight + 1;
    state = step(state, emptyInput(), FIXED_DT);
    expect(state.falls).toBe(1);
    expect(state.player.x).toBe(925);
    expect(state.player.y).toBe(360);
  });
});
