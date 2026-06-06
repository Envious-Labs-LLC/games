import { describe, it, expect } from "vitest";
import { createGame, step, FIXED_DT, type Input } from "../../src/sim/index";

const right: Input = { move: { x: 1, y: 0 } };

describe("determinism", () => {
  it("same seed + same inputs produce the same state", () => {
    const run = (seed: number): number => {
      const s = createGame(seed);
      for (let i = 0; i < 100; i++) step(s, right, FIXED_DT);
      return s.player.x;
    };
    expect(run(123)).toBe(run(123));
  });

  it("the player moves and stays in bounds", () => {
    const s = createGame(1);
    for (let i = 0; i < 1000; i++) step(s, right, FIXED_DT);
    expect(s.player.x).toBe(s.width); // clamped at the right edge
    expect(s.player.x).toBeLessThanOrEqual(s.width);
  });
});
