import { describe, expect, it } from "vitest";
import { createGame, emptyInput, step, FIXED_DT, type GameState, type Input } from "../../src/sim/index";

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
            restart: false,
          },
          FIXED_DT,
        );
      }
      return state;
    };
    expect(run()).toEqual(run());
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
