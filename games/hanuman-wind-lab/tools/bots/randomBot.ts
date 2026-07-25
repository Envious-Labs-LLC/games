import {
  createGame,
  emptyInput,
  findUsableWindAnchorIndex,
  step,
  FIXED_DT,
  GADA_STRIKE_REACH,
  type GameStatus,
  type Input,
} from "../../src/sim/index";

export interface BotResult {
  seed: number;
  ticks: number;
  outcome: GameStatus;
  sigils: number;
  falls: number;
  sealsBroken: number;
  formShifts: number;
  anchorUses: number;
  uniqueAnchorsUsed: number;
  totalAnchors: number;
  earthSlamStarts: number;
  earthSlamImpacts: number;
  earthSlamSealBreaks: number;
  sentriesDefeated: number;
  totalSentries: number;
  sentryDashDefeats: number;
  earthSlamSentryDefeats: number;
  sentryHits: number;
  shadowWavesFired: number;
  shadowWaveHits: number;
  earthSlamWaveDispels: number;
  gadaDefeats: number;
  attacks: number;
  routeVariant: number;
  jumpCommands: number;
  dashCommands: number;
}

export interface RecoveryProfileResult {
  waveHitRecovered: boolean;
  fallRecovered: boolean;
  wavesClearedAfterHit: boolean;
}

export interface SlamCounterProfileResult {
  waveDispelled: boolean;
  playerRecoveredOnGround: boolean;
}

export function runOne(seed: number, maxTicks = 12_000): BotResult {
  let state = createGame(seed);
  let ticks = 0;
  let wallKickUntil = 0;
  const routeVariant = seed % 3;
  const patrolJumpPeriod = [86, 90, 92][routeVariant]!;
  const patrolJumpOffset = [0, 6, 9][routeVariant]!;
  let jumpCommands = 0;
  let dashCommands = 0;

  for (; ticks < maxTicks && state.status === "playing"; ticks += 1) {
    const activeTick = ticks;
    const nextSigil = state.sigils.find((sigil) => !sigil.collected);
    const pendingSentry = state.shadowSentries.find(
      (sentry) => !sentry.defeated,
    );
    const progressTarget = pendingSentry ?? nextSigil;
    const targetDirection: -1 | 1 =
      progressTarget && progressTarget.x < state.player.x - 25 ? -1 : 1;
    const input: Input = {
      ...emptyInput(),
      moveX: ticks < wallKickUntil ? -1 : targetDirection,
    };
    const approachingSigil =
      nextSigil !== undefined && Math.abs(nextSigil.x - state.player.x) < 135;
    const approachingGap =
      (state.player.x > 535 && state.player.x < 645) ||
      (state.player.x > 1780 && state.player.x < 1865) ||
      (state.player.x > 2430 && state.player.x < 2470);
    const climbingWall =
      (state.player.x > 1080 && state.player.x < 1260) ||
      (state.player.x > 2380 && state.player.x < 2560);
    const nextSeal = state.seals.find(
      (seal) => !seal.broken && seal.x >= state.player.x - 40,
    );
    const sealDistance =
      nextSeal === undefined
        ? Number.POSITIVE_INFINITY
        : nextSeal.x - state.player.x;
    const approachingSeal =
      targetDirection === 1 && sealDistance > -40 && sealDistance < 150;
    const sentryDistance =
      pendingSentry === undefined
        ? Number.POSITIVE_INFINITY
        : pendingSentry.x - state.player.x;
    const approachingSentry = Math.abs(sentryDistance) < 165;
    const threateningShadowWave = state.shadowWaves.some((wave) => {
      const distance = wave.x - state.player.x;
      const movingTowardPlayer =
        (wave.vx < 0 && distance > 0) || (wave.vx > 0 && distance < 0);
      return movingTowardPlayer && Math.abs(distance) < 150;
    });
    const wantsSafeSlam =
      state.player.earthSlamImpactCount === 0 &&
      state.sigils[1]?.collected === true &&
      state.player.x > 1000 &&
      state.player.x < 1100;
    const wantsGadaStrike =
      approachingSentry &&
      state.player.y > 450 &&
      Math.abs(sentryDistance) < GADA_STRIKE_REACH + 15 &&
      state.player.gadaDefeatCount === 0;
    const wantsMountain =
      approachingSeal ||
      (approachingSentry && state.player.gadaDefeatCount > 0) ||
      wantsSafeSlam;

    input.formPressed =
      (wantsMountain && state.player.form === "wind") ||
      (!wantsMountain &&
        state.player.form === "mountain" &&
        state.player.dashTimer === 0);
    const usableAnchorIndex = findUsableWindAnchorIndex(state);
    const shouldStartEarthSlam =
      wantsSafeSlam &&
      state.player.form === "mountain" &&
      !state.player.onGround &&
      !state.player.earthSlamming &&
      state.player.earthSlamImpactCount === 0;
    input.powerPressed =
      usableAnchorIndex !== null &&
      !state.player.usedWindAnchorIndices.includes(usableAnchorIndex);
    input.powerPressed ||= shouldStartEarthSlam;

    input.jumpPressed =
      state.player.onGround &&
      (wantsSafeSlam ||
        approachingGap ||
        threateningShadowWave ||
        approachingSigil ||
        activeTick % patrolJumpPeriod === patrolJumpOffset);
    if (
      state.player.wallSide !== 0 &&
      !state.player.onGround &&
      activeTick % 7 === 0
    ) {
      input.jumpPressed = true;
      wallKickUntil = ticks + 9;
    }
    input.jumpHeld = !state.player.onGround && state.player.vy < 310;
    const shouldSmashSeal =
      approachingSeal &&
      state.player.earthSlamImpactCount > 0 &&
      state.player.dashAvailable &&
      (state.player.form === "mountain" || input.formPressed);
    const shouldSmashSentry =
      approachingSentry &&
      state.player.gadaDefeatCount > 0 &&
      state.player.dashAvailable &&
      (state.player.form === "mountain" || input.formPressed);
    input.dashPressed =
      shouldSmashSeal ||
      shouldSmashSentry ||
      (!state.player.onGround &&
        state.player.dashAvailable &&
        !climbingWall &&
        approachingGap);
    input.attackPressed =
      wantsGadaStrike &&
      !threateningShadowWave &&
      state.player.attackTimer === 0;
    if (state.player.attackTimer > 0 || input.attackPressed) {
      input.moveX = 0;
    }
    if (input.jumpPressed) jumpCommands += 1;
    if (input.dashPressed) dashCommands += 1;

    state = step(state, input, FIXED_DT);
  }

  return {
    seed,
    ticks,
    outcome: state.status,
    sigils: state.sigils.filter((sigil) => sigil.collected).length,
    falls: state.falls,
    sealsBroken: state.seals.filter((seal) => seal.broken).length,
    formShifts: state.player.formShiftCount,
    anchorUses: state.player.anchorUseCount,
    uniqueAnchorsUsed: state.player.usedWindAnchorIndices.length,
    totalAnchors: state.windAnchors.length,
    earthSlamStarts: state.player.earthSlamStartCount,
    earthSlamImpacts: state.player.earthSlamImpactCount,
    earthSlamSealBreaks: state.player.earthSlamSealBreakCount,
    sentriesDefeated: state.shadowSentries.filter((sentry) => sentry.defeated)
      .length,
    totalSentries: state.shadowSentries.length,
    sentryDashDefeats: state.player.sentryDashDefeatCount,
    earthSlamSentryDefeats: state.player.earthSlamSentryDefeatCount,
    sentryHits: state.player.sentryHitCount,
    shadowWavesFired: state.shadowSentries.reduce(
      (total, sentry) => total + sentry.pulseCount,
      0,
    ),
    shadowWaveHits: state.player.shadowWaveHitCount,
    earthSlamWaveDispels: state.player.earthSlamWaveDispelCount,
    gadaDefeats: state.player.gadaDefeatCount,
    attacks: state.player.attackCount,
    routeVariant,
    jumpCommands,
    dashCommands,
  };
}

export function runRecoveryProfile(seed: number): RecoveryProfileResult {
  let state = createGame(seed);
  state.started = true;
  state.checkpoint = { x: 500, y: 500 };
  state.player.x = 600;
  state.player.y = 500;
  state.player.onGround = true;
  state.shadowSentries[0]!.x = 900;
  state.shadowSentries[0]!.y = 500;
  state.shadowSentries[1]!.defeated = true;

  for (
    let tick = 0;
    tick < 300 && state.player.shadowWaveHitCount === 0;
    tick += 1
  ) {
    state = step(state, emptyInput(), FIXED_DT);
  }
  const waveHitRecovered =
    state.player.shadowWaveHitCount === 1 &&
    state.player.x === state.checkpoint.x &&
    state.player.y === state.checkpoint.y;
  const wavesClearedAfterHit = state.shadowWaves.length === 0;

  state.player.y = state.worldHeight + 1;
  state = step(state, emptyInput(), FIXED_DT);
  const fallRecovered =
    state.falls === 1 &&
    state.player.x === state.checkpoint.x &&
    state.player.y === state.checkpoint.y;

  return { waveHitRecovered, fallRecovered, wavesClearedAfterHit };
}

export function runSlamCounterProfile(seed: number): SlamCounterProfileResult {
  let state = createGame(seed);
  state.started = true;
  state.player.form = "mountain";
  state.player.x = 900;
  state.player.y = 430;
  state.player.onGround = false;
  for (const sentry of state.shadowSentries) sentry.defeated = true;
  state.shadowWaves.push({
    id: state.nextShadowWaveId++,
    x: 950,
    y: 500,
    vx: 0,
    ttl: 2,
    sourceIndex: 0,
  });

  state = step(
    state,
    { ...emptyInput(), powerPressed: true },
    FIXED_DT,
  );
  for (
    let tick = 0;
    tick < 20 && state.player.earthSlamming;
    tick += 1
  ) {
    state = step(state, emptyInput(), FIXED_DT);
  }

  return {
    waveDispelled:
      state.player.earthSlamWaveDispelCount === 1 &&
      state.shadowWaves.length === 0,
    playerRecoveredOnGround:
      state.player.onGround && !state.player.earthSlamming,
  };
}
