import { describe, expect, it } from "vitest";
import { createGame, emptyInput, step, FIXED_DT, type GameState, type Input } from "../../src/sim/index";

function runTicks(state: GameState, input: Input, ticks: number): GameState {
  let current = state;
  for (let i = 0; i < ticks; i += 1) current = step(current, input, FIXED_DT);
  return current;
}

describe("Flame of Lanka simulation", () => {
  it("repeats exactly with the same seed and inputs", () => {
    const run = (): GameState => {
      let state = createGame(108);
      for (let tick = 0; tick < 600; tick += 1) {
        state = step(
          state,
          {
            moveX: tick < 360 ? 1 : 0,
            jump: tick === 80,
            light: tick % 45 === 0,
            heavy: tick % 120 === 0,
            restart: false,
          },
          FIXED_DT,
        );
      }
      return state;
    };
    expect(run()).toEqual(run());
  });

  it("runs, jumps, lands, and stays inside the world", () => {
    let state = createGame(1);
    state = step(state, { ...emptyInput(), moveX: 1, jump: true }, FIXED_DT);
    expect(state.player.onGround).toBe(false);
    expect(state.player.y).toBeLessThan(state.groundY);

    state = runTicks(state, emptyInput(), 120);
    expect(state.player.onGround).toBe(true);

    state.player.x = state.worldWidth - 36;
    state = step(state, { ...emptyInput(), moveX: 1 }, FIXED_DT);
    expect(state.player.x).toBeLessThanOrEqual(state.worldWidth - 35);
  });

  it("damages a foe only once per attack", () => {
    let state = createGame(2);
    state.player.x = 570;
    const enemy = state.enemies[0]!;
    const startingHealth = enemy.health;

    state = step(state, { ...emptyInput(), light: true }, FIXED_DT);
    state = runTicks(state, emptyInput(), 12);
    expect(enemy.health).toBeLessThan(startingHealth);
    const afterHit = enemy.health;
    state = runTicks(state, emptyInput(), 6);
    expect(enemy.health).toBe(afterHit);
  });

  it("supports defeat and a fresh restart", () => {
    let state = createGame(3);
    state.player.health = 0;
    state = step(state, emptyInput(), FIXED_DT);
    expect(state.status).toBe("lost");

    state = step(state, { ...emptyInput(), restart: true }, FIXED_DT);
    expect(state.status).toBe("playing");
    expect(state.player.health).toBe(state.player.maxHealth);
    expect(state.seed).toBe(4);
  });
});
