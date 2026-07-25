import { describe, expect, it } from "vitest";
import { createGame } from "../../src/sim/index";
import { GameAudio } from "../../src/view/audio";

describe("game audio event consumption", () => {
  it("consumes muted bursts without replaying them after unmute", () => {
    const audio = new GameAudio();
    const state = createGame(205);
    state.bursts.push({
      id: 1,
      kind: "jump",
      x: 110,
      y: 500,
      facing: 1,
      ttl: 0.3,
    });

    audio.toggleMuted();
    audio.sync(state);
    expect(audio.lastConsumedBurstId).toBe(1);

    audio.toggleMuted();
    audio.sync(state);
    expect(audio.lastConsumedBurstId).toBe(1);
  });
});
