import {
  createGame,
  emptyInput,
  FIXED_DT,
  step,
  type GameState,
  type Input,
} from "../src/sim/index";

const SOAK_TICKS = 36_000;
const RESTART_EVERY = 3_276;
const EXPECTED_RESTARTS = 10;

function inputForTick(tick: number): Input {
  const phase = tick % 720;
  return {
    ...emptyInput(),
    moveX: phase < 540 ? 1 : -1,
    jumpPressed: tick % 83 === 0,
    jumpHeld: tick % 83 < 27,
    dashPressed: tick % 131 === 41,
    formPressed: tick % 211 === 79,
    powerPressed: tick % 173 === 59,
    attackPressed: tick % 97 === 33,
    restart: tick > 0 && tick % RESTART_EVERY === 0,
  };
}

function assertHealthy(state: GameState, tick: number): void {
  const values = [
    state.player.x,
    state.player.y,
    state.player.vx,
    state.player.vy,
    state.elapsed,
  ];
  if (!values.every(Number.isFinite)) {
    throw new Error(`non-finite simulation value at soak tick ${tick}`);
  }
  if (state.player.x < 0 || state.player.x > state.worldWidth) {
    throw new Error(`player escaped world bounds at soak tick ${tick}`);
  }
  if (state.shadowWaves.length > 8) {
    throw new Error(`shadow wave count grew without bound at soak tick ${tick}`);
  }
  if (state.bursts.length > 32) {
    throw new Error(`effect count grew without bound at soak tick ${tick}`);
  }
}

function runContinuousSoak(): GameState {
  let state = createGame(9000);
  for (let tick = 0; tick < SOAK_TICKS; tick += 1) {
    state = step(
      state,
      { ...inputForTick(tick), restart: false },
      FIXED_DT,
    );
    assertHealthy(state, tick);
  }
  return state;
}

function runRestartCycle(): GameState {
  let state = createGame(9100);
  for (let tick = 0; tick < SOAK_TICKS; tick += 1) {
    state = step(state, inputForTick(tick), FIXED_DT);
    assertHealthy(state, tick);
  }
  return state;
}

const firstContinuous = runContinuousSoak();
const secondContinuous = runContinuousSoak();
if (JSON.stringify(firstContinuous) !== JSON.stringify(secondContinuous)) {
  throw new Error("10-minute soak did not replay deterministically");
}

const firstRestartCycle = runRestartCycle();
const secondRestartCycle = runRestartCycle();
if (JSON.stringify(firstRestartCycle) !== JSON.stringify(secondRestartCycle)) {
  throw new Error("restart-cycle soak did not replay deterministically");
}
if (firstRestartCycle.seed !== 9100 + EXPECTED_RESTARTS) {
  throw new Error(
    `expected ${EXPECTED_RESTARTS} restarts, got ${firstRestartCycle.seed - 9100}`,
  );
}

console.log(
  JSON.stringify({
    continuousTicks: SOAK_TICKS,
    continuousMinutes: SOAK_TICKS / 60 / 60,
    restartCycleTicks: SOAK_TICKS,
    restarts: firstRestartCycle.seed - 9100,
    deterministic: true,
    continuousFinalStatus: firstContinuous.status,
    restartCycleFinalStatus: firstRestartCycle.status,
  }),
);
