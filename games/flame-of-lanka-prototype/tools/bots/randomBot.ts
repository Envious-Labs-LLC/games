import { createGame, emptyInput, step, FIXED_DT, type GameStatus, type Input } from "../../src/sim/index";
import { makeRng, nextInt } from "../../src/sim/rng";

export interface BotResult {
  seed: number;
  ticks: number;
  outcome: GameStatus;
  score: number;
}

export function runOne(seed: number, maxTicks = 7200): BotResult {
  let state = createGame(seed);
  const botRng = makeRng((seed ^ 0x9e3779b9) >>> 0);
  let ticks = 0;

  for (; ticks < maxTicks && state.status === "playing"; ticks += 1) {
    const nearest = state.enemies
      .filter((enemy) => enemy.health > 0)
      .sort(
        (a, b) =>
          Math.abs(a.x - state.player.x) - Math.abs(b.x - state.player.x) || a.id - b.id,
      )[0];
    const input: Input = emptyInput();

    if (nearest) {
      const distance = nearest.x - state.player.x;
      if (Math.abs(distance) > 108) input.moveX = distance > 0 ? 1 : -1;
      else {
        input.heavy = ticks % 8 === 0;
        input.light = !input.heavy && ticks % 5 === 0;
        if (state.player.attackCooldown > 0.18 && Math.abs(distance) < 76) {
          input.moveX = distance > 0 ? -1 : 1;
        }
      }
    }

    input.jump = ticks % (95 + nextInt(botRng, 0, 35)) === 0;
    state = step(state, input, FIXED_DT);
  }

  return { seed, ticks, outcome: state.status, score: state.score };
}
