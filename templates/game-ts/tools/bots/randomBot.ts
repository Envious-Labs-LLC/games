// A bot that drives the sim headless with random valid inputs from its own
// seeded RNG (separate from the game's RNG so it does not disturb gameplay
// randomness). The best crash finder. See .claude/skills/write-playtest-bot.

import { createGame, step, FIXED_DT, type Input } from "../../src/sim/index";
import { makeRng, nextInt } from "../../src/sim/rng";

export interface BotResult {
  seed: number;
  ticks: number;
  finalX: number;
  finalY: number;
}

export function runOne(seed: number, ticks = 600): BotResult {
  const s = createGame(seed);
  const botRng = makeRng((seed ^ 0x9e3779b9) >>> 0);
  for (let i = 0; i < ticks; i++) {
    const input: Input = {
      move: { x: nextInt(botRng, -1, 1), y: nextInt(botRng, -1, 1) },
    };
    step(s, input, FIXED_DT);
  }
  return { seed, ticks, finalX: s.player.x, finalY: s.player.y };
}
