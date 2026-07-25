import {
  createGame,
  emptyInput,
  findUsableWindAnchorIndex,
  step,
  FIXED_DT,
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
}

export function runOne(seed: number, maxTicks = 12_000): BotResult {
  let state = createGame(seed);
  let ticks = 0;
  let wallKickUntil = 0;

  for (; ticks < maxTicks && state.status === "playing"; ticks += 1) {
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
    const wantsSafeSlam =
      state.player.earthSlamImpactCount === 0 &&
      state.sigils[1]?.collected === true &&
      state.player.x > 1000 &&
      state.player.x < 1100;
    const wantsSentrySlam =
      approachingSentry &&
      state.player.y > 450 &&
      state.player.earthSlamStartCount === 1;
    const wantsMountain = approachingSeal || approachingSentry || wantsSafeSlam;

    input.formPressed =
      (wantsMountain && state.player.form === "wind") ||
      (!wantsMountain &&
        state.player.form === "mountain" &&
        state.player.dashTimer === 0);
    const usableAnchorIndex = findUsableWindAnchorIndex(state);
    const shouldStartEarthSlam =
      (wantsSafeSlam || wantsSentrySlam) &&
      state.player.form === "mountain" &&
      !state.player.onGround &&
      !state.player.earthSlamming &&
      (!wantsSafeSlam || state.player.earthSlamImpactCount === 0);
    input.powerPressed =
      usableAnchorIndex !== null &&
      !state.player.usedWindAnchorIndices.includes(usableAnchorIndex);
    input.powerPressed ||= shouldStartEarthSlam;

    input.jumpPressed =
      state.player.onGround &&
      (wantsSafeSlam ||
        wantsSentrySlam ||
        approachingGap ||
        approachingSigil ||
        ticks % 90 === 0);
    if (
      state.player.wallSide !== 0 &&
      !state.player.onGround &&
      ticks % 7 === 0
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
      state.player.earthSlamStartCount > 1 &&
      state.player.dashAvailable &&
      (state.player.form === "mountain" || input.formPressed);
    input.dashPressed =
      shouldSmashSeal ||
      shouldSmashSentry ||
      (!state.player.onGround &&
        state.player.dashAvailable &&
        !climbingWall &&
        approachingGap);

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
  };
}
