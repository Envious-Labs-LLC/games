import { createGame, emptyInput, step, FIXED_DT, type GameStatus, type Input } from "../../src/sim/index";

export interface BotResult {
  seed: number;
  ticks: number;
  outcome: GameStatus;
  sigils: number;
  falls: number;
}

export function runOne(seed: number, maxTicks = 12_000): BotResult {
  let state = createGame(seed);
  let ticks = 0;
  let wallKickUntil = 0;

  for (; ticks < maxTicks && state.status === "playing"; ticks += 1) {
    const nextSigil = state.sigils.find((sigil) => !sigil.collected);
    const targetDirection: -1 | 1 =
      nextSigil && nextSigil.x < state.player.x - 25 ? -1 : 1;
    const input: Input = {
      ...emptyInput(),
      moveX: ticks < wallKickUntil ? -1 : targetDirection,
    };
    const approachingSigil =
      nextSigil !== undefined &&
      Math.abs(nextSigil.x - state.player.x) < 135;
    const approachingGap =
      (state.player.x > 535 && state.player.x < 645) ||
      (state.player.x > 1780 && state.player.x < 1865) ||
      (state.player.x > 2430 && state.player.x < 2470);
    const climbingWall =
      (state.player.x > 1080 && state.player.x < 1260) ||
      (state.player.x > 2380 && state.player.x < 2560);

    input.jumpPressed =
      state.player.onGround && (approachingGap || approachingSigil || ticks % 90 === 0);
    if (state.player.wallSide !== 0 && !state.player.onGround && ticks % 7 === 0) {
      input.jumpPressed = true;
      wallKickUntil = ticks + 9;
    }
    input.jumpHeld = !state.player.onGround && state.player.vy < 310;
    input.dashPressed =
      !state.player.onGround &&
      state.player.dashAvailable &&
      !climbingWall &&
      approachingGap;

    state = step(state, input, FIXED_DT);
  }

  return {
    seed,
    ticks,
    outcome: state.status,
    sigils: state.sigils.filter((sigil) => sigil.collected).length,
    falls: state.falls,
  };
}
