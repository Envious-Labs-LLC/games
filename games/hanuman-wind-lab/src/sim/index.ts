import movement from "../../content/design/movement.json";
import course from "../../content/design/course.json";
import { makeRng, type Rng } from "./rng";

export const FIXED_DT = 1 / 60;
export const PLAYER_HALF_WIDTH = 15;
export const PLAYER_HEIGHT = 48;
export const EARTH_SLAM_SHOCKWAVE_RADIUS =
  movement.mountainForm.earthSlam.shockwaveRadius;
export const SHADOW_SENTRY_WIDTH = movement.shadowSentry.width;
export const SHADOW_SENTRY_HEIGHT = movement.shadowSentry.height;
export const SHADOW_SENTRY_TELEGRAPH_TIME =
  movement.shadowSentry.telegraphTime;
export const SHADOW_SENTRY_ACTIVATION_RANGE =
  movement.shadowSentry.activationRange;
export const SHADOW_SENTRY_PULSE_COOLDOWN =
  movement.shadowSentry.pulseCooldown;
export const SHADOW_WAVE_WIDTH = movement.shadowSentry.waveWidth;
export const SHADOW_WAVE_HEIGHT = movement.shadowSentry.waveHeight;
export const SHADOW_WAVE_LIFETIME = movement.shadowSentry.waveLifetime;
export const GADA_STRIKE_REACH = movement.gadaStrike.reach;
export const GADA_STRIKE_TOTAL_TIME =
  movement.gadaStrike.windupTime +
  movement.gadaStrike.activeTime +
  movement.gadaStrike.recoveryTime;

export type GameStatus = "playing" | "won";
export type PlayerForm = "wind" | "mountain";
export type BurstKind =
  | "jump"
  | "dash"
  | "land"
  | "sigil"
  | "fall"
  | "transform"
  | "break"
  | "anchor"
  | "slam"
  | "shockwave"
  | "defeat"
  | "hit"
  | "pulse"
  | "dispel"
  | "strike";

export interface Input {
  moveX: -1 | 0 | 1;
  jumpPressed: boolean;
  jumpHeld: boolean;
  dashPressed: boolean;
  formPressed: boolean;
  powerPressed: boolean;
  attackPressed: boolean;
  restart: boolean;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Sigil {
  x: number;
  y: number;
  collected: boolean;
}

export interface Seal extends Platform {
  broken: boolean;
}

export interface WindAnchor {
  x: number;
  y: number;
}

export interface ShadowSentry {
  x: number;
  y: number;
  defeated: boolean;
  telegraphTimer: number;
  cooldownTimer: number;
  pulseCount: number;
}

export interface ShadowWave {
  id: number;
  x: number;
  y: number;
  vx: number;
  ttl: number;
  sourceIndex: number;
}

export interface Burst {
  id: number;
  kind: BurstKind;
  x: number;
  y: number;
  facing: -1 | 1;
  ttl: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: -1 | 1;
  onGround: boolean;
  wallSide: -1 | 0 | 1;
  dashAvailable: boolean;
  dashTimer: number;
  dashCount: number;
  jumpHoldTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  gliding: boolean;
  form: PlayerForm;
  formShiftCount: number;
  anchorCooldown: number;
  anchorUseCount: number;
  usedWindAnchorIndices: number[];
  earthSlamming: boolean;
  earthSlamStartCount: number;
  earthSlamImpactCount: number;
  earthSlamSealBreakCount: number;
  earthSlamSentryDefeatCount: number;
  sentryDashDefeatCount: number;
  sentryHitCount: number;
  shadowWaveHitCount: number;
  earthSlamWaveDispelCount: number;
  attackTimer: number;
  attackFacing: -1 | 1;
  attackCount: number;
  gadaDefeatCount: number;
}

export interface GameState {
  seed: number;
  rng: Rng;
  tick: number;
  status: GameStatus;
  started: boolean;
  elapsed: number;
  worldWidth: number;
  worldHeight: number;
  player: Player;
  platforms: Platform[];
  sigils: Sigil[];
  seals: Seal[];
  windAnchors: WindAnchor[];
  shadowSentries: ShadowSentry[];
  shadowWaves: ShadowWave[];
  nextShadowWaveId: number;
  finish: { x: number; y: number };
  checkpoint: { x: number; y: number };
  falls: number;
  bursts: Burst[];
  nextBurstId: number;
  statusTimer: number;
}

export function emptyInput(): Input {
  return {
    moveX: 0,
    jumpPressed: false,
    jumpHeld: false,
    dashPressed: false,
    formPressed: false,
    powerPressed: false,
    attackPressed: false,
    restart: false,
  };
}

export function createGame(seed: number): GameState {
  return {
    seed,
    rng: makeRng(seed),
    tick: 0,
    status: "playing",
    started: false,
    elapsed: 0,
    worldWidth: movement.worldWidth,
    worldHeight: movement.worldHeight,
    player: {
      x: 110,
      y: 500,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: true,
      wallSide: 0,
      dashAvailable: true,
      dashTimer: 0,
      dashCount: 0,
      jumpHoldTimer: 0,
      coyoteTimer: movement.coyoteTime,
      jumpBufferTimer: 0,
      gliding: false,
      form: "wind",
      formShiftCount: 0,
      anchorCooldown: 0,
      anchorUseCount: 0,
      usedWindAnchorIndices: [],
      earthSlamming: false,
      earthSlamStartCount: 0,
      earthSlamImpactCount: 0,
      earthSlamSealBreakCount: 0,
      earthSlamSentryDefeatCount: 0,
      sentryDashDefeatCount: 0,
      sentryHitCount: 0,
      shadowWaveHitCount: 0,
      earthSlamWaveDispelCount: 0,
      attackTimer: 0,
      attackFacing: 1,
      attackCount: 0,
      gadaDefeatCount: 0,
    },
    platforms: course.platforms.map((platform) => ({ ...platform })),
    sigils: course.sigils.map((sigil) => ({ ...sigil, collected: false })),
    seals: course.seals.map((seal) => ({ ...seal, broken: false })),
    windAnchors: course.windAnchors.map((anchor) => ({ ...anchor })),
    shadowSentries: course.shadowSentries.map((sentry) => ({
      ...sentry,
      defeated: false,
      telegraphTimer: 0,
      cooldownTimer: 0,
      pulseCount: 0,
    })),
    shadowWaves: [],
    nextShadowWaveId: 1,
    finish: { ...course.finish },
    checkpoint: { x: 110, y: 500 },
    falls: 0,
    bursts: [],
    nextBurstId: 1,
    statusTimer: 0,
  };
}

export function step(state: GameState, input: Input, dt: number): GameState {
  if (input.restart) return createGame(state.seed + 1);

  state.tick += 1;
  tickBursts(state, dt);
  if (state.status === "won") {
    state.statusTimer += dt;
    return state;
  }

  const isAction =
    input.moveX !== 0 ||
    input.jumpPressed ||
    input.jumpHeld ||
    input.dashPressed ||
    input.formPressed ||
    input.powerPressed ||
    input.attackPressed;
  if (!state.started && !isAction) return state;
  state.started = true;
  state.elapsed += dt;

  updatePlayer(state, input, dt);
  resolveGadaStrike(state);
  updateShadowSentries(state, dt);
  updateShadowWaves(state, dt);
  state.player.dashTimer = Math.max(0, state.player.dashTimer - dt);
  state.player.attackTimer = Math.max(0, state.player.attackTimer - dt);
  collectSigils(state);

  if (
    isFinishReady(state) &&
    !state.player.earthSlamming &&
    state.player.x >= state.finish.x - 58
  ) {
    state.status = "won";
    state.statusTimer = 0;
    state.shadowWaves = [];
    addBurst(state, "sigil", state.finish.x, state.finish.y - 70, 1);
  }

  return state;
}

function updatePlayer(state: GameState, input: Input, dt: number): void {
  const player = state.player;
  const attackLocked = player.attackTimer > 0;
  if (input.moveX !== 0 && !player.earthSlamming && !attackLocked) {
    player.facing = input.moveX;
  }
  player.anchorCooldown = Math.max(0, player.anchorCooldown - dt);

  const startedStrike =
    input.attackPressed &&
    !player.earthSlamming &&
    !attackLocked &&
    player.dashTimer === 0;
  if (startedStrike) {
    player.attackTimer = GADA_STRIKE_TOTAL_TIME;
    player.attackFacing = player.facing;
    player.attackCount += 1;
    addBurst(
      state,
      "strike",
      player.x + player.attackFacing * GADA_STRIKE_REACH * 0.55,
      player.y - PLAYER_HEIGHT * 0.55,
      player.attackFacing,
    );
  }

  if (
    input.formPressed &&
    !player.earthSlamming &&
    !attackLocked &&
    !startedStrike
  ) {
    player.form = player.form === "wind" ? "mountain" : "wind";
    player.formShiftCount += 1;
    player.gliding = false;
    addBurst(state, "transform", player.x, player.y - 24, player.facing);
  }

  if (input.jumpPressed) player.jumpBufferTimer = movement.jumpBufferTime;
  else player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);

  if (player.onGround) player.coyoteTimer = movement.coyoteTime;
  else player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);

  const powerForm =
    !input.formPressed &&
    !player.earthSlamming &&
    !attackLocked &&
    !startedStrike
      ? player.form
      : null;
  const powered =
    input.powerPressed &&
    (powerForm === "wind"
      ? tryWindVault(state, input)
      : powerForm === "mountain"
        ? tryEarthSlam(state)
        : false);
  if (
    !powered &&
    !startedStrike &&
    !player.earthSlamming &&
    player.attackTimer === 0 &&
    input.dashPressed &&
    player.dashAvailable &&
    player.dashTimer === 0
  ) {
    const airborne = !player.onGround;
    player.dashTimer = movement.dashDuration;
    if (airborne) player.dashAvailable = false;
    player.dashCount += 1;
    player.vx = player.facing * dashSpeedFor(player.form);
    player.vy = 0;
    addBurst(state, "dash", player.x, player.y - 24, player.facing);
  }

  const canGroundJump = player.onGround || player.coyoteTimer > 0;
  if (
    !powered &&
    !player.earthSlamming &&
    player.attackTimer === 0 &&
    player.jumpBufferTimer > 0 &&
    (canGroundJump || player.wallSide !== 0)
  ) {
    if (player.wallSide !== 0 && !player.onGround) {
      player.vx = -player.wallSide * movement.wallJumpX;
      player.facing = player.wallSide === 1 ? -1 : 1;
    }
    player.vy =
      player.form === "mountain"
        ? -movement.mountainForm.jumpSpeed
        : -movement.jumpSpeed;
    player.onGround = false;
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;
    player.jumpHoldTimer = movement.jumpHoldTime;
    player.dashAvailable = true;
    player.dashTimer = 0;
    addBurst(state, "jump", player.x, player.y, player.facing);
  }

  if (player.earthSlamming) {
    player.vx = 0;
    player.vy = movement.mountainForm.earthSlam.speed;
    player.gliding = false;
    player.jumpBufferTimer = 0;
    player.jumpHoldTimer = 0;
    player.dashTimer = 0;
  } else if (player.dashTimer > 0) {
    player.vx = player.facing * dashSpeedFor(player.form);
    player.vy = 0;
  } else {
    const acceleration = player.onGround
      ? movement.groundAcceleration
      : movement.airAcceleration;
    const runSpeed =
      player.form === "mountain"
        ? movement.mountainForm.runSpeed
        : movement.runSpeed;
    const targetVx = input.moveX * runSpeed;
    if (input.moveX !== 0) {
      player.vx = approach(player.vx, targetVx, acceleration * dt);
    } else if (player.onGround) {
      player.vx = approach(player.vx, 0, movement.friction * dt);
    } else {
      player.vx = approach(player.vx, 0, movement.airAcceleration * 0.12 * dt);
    }

    if (input.jumpHeld && player.vy < 0 && player.jumpHoldTimer > 0) {
      player.vy -= movement.jumpHoldForce * dt;
      player.jumpHoldTimer = Math.max(0, player.jumpHoldTimer - dt);
    } else if (!input.jumpHeld) {
      player.jumpHoldTimer = 0;
    }

    player.gliding =
      player.form === "wind" &&
      input.jumpHeld &&
      player.vy > 20 &&
      !player.onGround;
    const baseGravity =
      player.form === "mountain"
        ? movement.mountainForm.gravity
        : movement.gravity;
    const gravity = player.gliding ? baseGravity * 0.2 : baseGravity;
    player.vy = Math.min(player.vy + gravity * dt, movement.maxFallSpeed);
    if (player.gliding)
      player.vy = Math.min(player.vy, movement.glideFallSpeed);
  }

  const mountainDashing = player.form === "mountain" && player.dashTimer > 0;
  moveAndCollide(state, dt, mountainDashing);

  if (player.y > state.worldHeight) {
    state.falls += 1;
    addBurst(state, "fall", player.x, state.worldHeight - 12, player.facing);
    resetPlayerToCheckpoint(state);
  }
}

function moveAndCollide(
  state: GameState,
  dt: number,
  mountainDashing: boolean,
): void {
  const player = state.player;
  const previousX = player.x;
  const previousY = player.y;
  let nextX = clamp(
    previousX + player.vx * dt,
    PLAYER_HALF_WIDTH,
    state.worldWidth - PLAYER_HALF_WIDTH,
  );
  player.wallSide = 0;

  for (const platform of state.platforms) {
    if (platform.height <= 20) continue;
    if (!verticalOverlap(previousY, platform)) continue;
    const previousRight = previousX + PLAYER_HALF_WIDTH;
    const nextRight = nextX + PLAYER_HALF_WIDTH;
    const previousLeft = previousX - PLAYER_HALF_WIDTH;
    const nextLeft = nextX - PLAYER_HALF_WIDTH;

    if (
      player.vx > 0 &&
      previousRight <= platform.x &&
      nextRight >= platform.x
    ) {
      nextX = platform.x - PLAYER_HALF_WIDTH;
      player.vx = 0;
      player.wallSide = 1;
    } else if (
      player.vx < 0 &&
      previousLeft >= platform.x + platform.width &&
      nextLeft <= platform.x + platform.width
    ) {
      nextX = platform.x + platform.width + PLAYER_HALF_WIDTH;
      player.vx = 0;
      player.wallSide = -1;
    }
  }

  for (const seal of state.seals) {
    if (seal.broken || !verticalOverlap(previousY, seal)) continue;
    const previousRight = previousX + PLAYER_HALF_WIDTH;
    const nextRight = nextX + PLAYER_HALF_WIDTH;
    const previousLeft = previousX - PLAYER_HALF_WIDTH;
    const nextLeft = nextX - PLAYER_HALF_WIDTH;
    const hitsFromLeft =
      player.vx > 0 && previousRight <= seal.x && nextRight >= seal.x;
    const hitsFromRight =
      player.vx < 0 &&
      previousLeft >= seal.x + seal.width &&
      nextLeft <= seal.x + seal.width;
    if (!hitsFromLeft && !hitsFromRight) continue;

    if (player.form === "mountain" && player.dashTimer > 0) {
      seal.broken = true;
      addBurst(
        state,
        "break",
        seal.x + seal.width * 0.5,
        seal.y + seal.height * 0.5,
        player.facing,
      );
      continue;
    }

    nextX = hitsFromLeft
      ? seal.x - PLAYER_HALF_WIDTH
      : seal.x + seal.width + PLAYER_HALF_WIDTH;
    player.vx = 0;
    player.wallSide = hitsFromLeft ? 1 : -1;
  }
  player.x = nextX;

  const nextY = previousY + player.vy * dt;
  let landedY: number | null = null;
  let ceilingY: number | null = null;

  const verticalSurfaces: Platform[] = [
    ...state.platforms,
    ...state.seals.filter((seal) => !seal.broken),
  ];
  for (const platform of verticalSurfaces) {
    if (!horizontalOverlap(player.x, platform)) continue;
    if (player.vy >= 0 && previousY <= platform.y && nextY >= platform.y) {
      landedY = landedY === null ? platform.y : Math.min(landedY, platform.y);
    } else {
      const platformBottom = platform.y + platform.height;
      const previousTop = previousY - PLAYER_HEIGHT;
      const nextTop = nextY - PLAYER_HEIGHT;
      if (
        platform.height > 20 &&
        player.vy < 0 &&
        previousTop >= platformBottom &&
        nextTop <= platformBottom
      ) {
        ceilingY =
          ceilingY === null
            ? platformBottom
            : Math.max(ceilingY, platformBottom);
      }
    }
  }

  const wasOnGround = player.onGround;
  const wasEarthSlamming = player.earthSlamming;
  if (landedY !== null) {
    player.y = landedY;
    player.vy = 0;
    player.onGround = true;
    player.gliding = false;
    player.dashAvailable = true;
    if (!wasOnGround) {
      if (wasEarthSlamming) {
        player.earthSlamming = false;
        player.earthSlamImpactCount += 1;
        player.earthSlamSealBreakCount += breakSealsFromEarthSlam(state);
        player.earthSlamSentryDefeatCount += defeatSentriesFromEarthSlam(state);
        player.earthSlamWaveDispelCount += dispelWavesFromEarthSlam(state);
        addBurst(state, "shockwave", player.x, player.y, player.facing);
      } else {
        addBurst(state, "land", player.x, player.y, player.facing);
      }
    }
  } else if (ceilingY !== null) {
    player.y = ceilingY + PLAYER_HEIGHT;
    player.vy = Math.max(0, player.vy);
    player.onGround = false;
  } else {
    player.y = nextY;
    player.onGround = false;
  }

  const wallSlideSpeed =
    player.form === "mountain"
      ? movement.mountainForm.wallSlideSpeed
      : movement.wallSlideSpeed;
  if (player.wallSide !== 0 && !player.onGround && player.vy > wallSlideSpeed) {
    player.vy = wallSlideSpeed;
    player.dashAvailable = true;
  }

  resolveShadowSentryContacts(state, previousX, mountainDashing);
}

function collectSigils(state: GameState): void {
  for (const sigil of state.sigils) {
    if (sigil.collected) continue;
    const dx = state.player.x - sigil.x;
    const dy = state.player.y - PLAYER_HEIGHT * 0.5 - sigil.y;
    if (dx * dx + dy * dy > 100 * 100) continue;

    sigil.collected = true;
    state.player.dashAvailable = true;
    const checkpointPlatform = findPlatformBelow(
      state.platforms,
      sigil.x,
      sigil.y,
    );
    if (checkpointPlatform) {
      state.checkpoint = {
        x: clamp(
          sigil.x,
          checkpointPlatform.x + 25,
          checkpointPlatform.x + checkpointPlatform.width - 25,
        ),
        y: checkpointPlatform.y,
      };
    }
    addBurst(state, "sigil", sigil.x, sigil.y, state.player.facing);
  }
}

function tryWindVault(state: GameState, input: Input): boolean {
  const player = state.player;
  const anchorIndex = findUsableWindAnchorIndex(state);
  if (anchorIndex === null) return false;
  const anchor = state.windAnchors[anchorIndex]!;

  const direction = input.moveX === 0 ? player.facing : input.moveX;
  player.facing = direction;
  player.vx = direction * movement.windAnchor.launchX;
  player.vy = -movement.windAnchor.launchY;
  player.onGround = false;
  player.coyoteTimer = 0;
  player.jumpBufferTimer = 0;
  player.jumpHoldTimer = 0;
  player.gliding = false;
  player.dashTimer = 0;
  player.dashAvailable = true;
  player.anchorCooldown = movement.windAnchor.cooldown;
  player.anchorUseCount += 1;
  if (!player.usedWindAnchorIndices.includes(anchorIndex)) {
    player.usedWindAnchorIndices.push(anchorIndex);
  }
  addBurst(state, "anchor", anchor.x, anchor.y, direction);
  return true;
}

function tryEarthSlam(state: GameState): boolean {
  const player = state.player;
  if (player.form !== "mountain" || player.onGround || player.earthSlamming) {
    return false;
  }

  player.earthSlamming = true;
  player.earthSlamStartCount += 1;
  player.vx = 0;
  player.vy = movement.mountainForm.earthSlam.speed;
  player.gliding = false;
  player.jumpBufferTimer = 0;
  player.jumpHoldTimer = 0;
  player.dashTimer = 0;
  addBurst(
    state,
    "slam",
    player.x,
    player.y - PLAYER_HEIGHT * 0.5,
    player.facing,
  );
  return true;
}

function breakSealsFromEarthSlam(state: GameState): number {
  const impactX = state.player.x;
  const impactY = state.player.y;
  const radiusSquared =
    EARTH_SLAM_SHOCKWAVE_RADIUS * EARTH_SLAM_SHOCKWAVE_RADIUS;
  let brokenCount = 0;

  for (const seal of state.seals) {
    if (seal.broken) continue;
    const closestX = clamp(impactX, seal.x, seal.x + seal.width);
    const closestY = clamp(impactY, seal.y, seal.y + seal.height);
    const dx = impactX - closestX;
    const dy = impactY - closestY;
    if (dx * dx + dy * dy > radiusSquared) continue;

    seal.broken = true;
    brokenCount += 1;
    addBurst(
      state,
      "break",
      seal.x + seal.width * 0.5,
      seal.y + seal.height * 0.5,
      state.player.facing,
    );
  }

  return brokenCount;
}

function defeatSentriesFromEarthSlam(state: GameState): number {
  let defeatedCount = 0;
  for (let index = 0; index < state.shadowSentries.length; index += 1) {
    const sentry = state.shadowSentries[index]!;
    if (
      sentry.defeated ||
      distanceSquaredToSentry(state.player.x, state.player.y, sentry) >
        EARTH_SLAM_SHOCKWAVE_RADIUS * EARTH_SLAM_SHOCKWAVE_RADIUS
    ) {
      continue;
    }
    defeatShadowSentry(state, sentry, index);
    defeatedCount += 1;
    addBurst(
      state,
      "defeat",
      sentry.x,
      sentry.y - SHADOW_SENTRY_HEIGHT * 0.5,
      state.player.attackFacing,
    );
  }
  return defeatedCount;
}

function resolveGadaStrike(state: GameState): void {
  if (!isGadaStrikeActive(state.player)) return;
  for (let index = 0; index < state.shadowSentries.length; index += 1) {
    const sentry = state.shadowSentries[index]!;
    if (sentry.defeated || !gadaStrikeOverlapsSentry(state.player, sentry)) {
      continue;
    }
    defeatShadowSentry(state, sentry, index);
    state.player.gadaDefeatCount += 1;
    addBurst(
      state,
      "defeat",
      sentry.x,
      sentry.y - SHADOW_SENTRY_HEIGHT * 0.5,
      state.player.facing,
    );
  }
}

export function isGadaStrikeActive(player: Player): boolean {
  const elapsed = GADA_STRIKE_TOTAL_TIME - player.attackTimer;
  return (
    player.attackTimer > 0 &&
    elapsed >= movement.gadaStrike.windupTime &&
    elapsed <
      movement.gadaStrike.windupTime + movement.gadaStrike.activeTime
  );
}

function gadaStrikeOverlapsSentry(
  player: Player,
  sentry: ShadowSentry,
): boolean {
  const strikeLeft =
    player.attackFacing === 1 ? player.x : player.x - GADA_STRIKE_REACH;
  const strikeRight =
    player.attackFacing === 1 ? player.x + GADA_STRIKE_REACH : player.x;
  const strikeCenterY = player.y - PLAYER_HEIGHT * 0.5;
  const strikeTop = strikeCenterY - movement.gadaStrike.height * 0.5;
  const strikeBottom = strikeCenterY + movement.gadaStrike.height * 0.5;
  const sentryLeft = sentry.x - SHADOW_SENTRY_WIDTH * 0.5;
  const sentryRight = sentry.x + SHADOW_SENTRY_WIDTH * 0.5;
  const sentryTop = sentry.y - SHADOW_SENTRY_HEIGHT;
  return (
    strikeRight > sentryLeft &&
    strikeLeft < sentryRight &&
    strikeBottom > sentryTop &&
    strikeTop < sentry.y
  );
}

function resolveShadowSentryContacts(
  state: GameState,
  previousX: number,
  mountainDashing: boolean,
): void {
  const player = state.player;
  for (let index = 0; index < state.shadowSentries.length; index += 1) {
    const sentry = state.shadowSentries[index]!;
    if (sentry.defeated || !playerOverlapsSentry(player, previousX, sentry)) {
      continue;
    }

    if (mountainDashing) {
      defeatShadowSentry(state, sentry, index);
      player.sentryDashDefeatCount += 1;
      addBurst(
        state,
        "defeat",
        sentry.x,
        sentry.y - SHADOW_SENTRY_HEIGHT * 0.5,
        player.facing,
      );
      continue;
    }

    player.sentryHitCount += 1;
    addBurst(
      state,
      "hit",
      player.x,
      player.y - PLAYER_HEIGHT * 0.5,
      player.facing,
    );
    resetPlayerToCheckpoint(state);
    return;
  }
}

function updateShadowSentries(state: GameState, dt: number): void {
  for (let index = 0; index < state.shadowSentries.length; index += 1) {
    const sentry = state.shadowSentries[index]!;
    if (sentry.defeated) continue;

    if (sentry.telegraphTimer > 0) {
      sentry.telegraphTimer = Math.max(0, sentry.telegraphTimer - dt);
      if (sentry.telegraphTimer === 0) {
        fireShadowWave(state, sentry, index);
        sentry.cooldownTimer = movement.shadowSentry.pulseCooldown;
      }
      continue;
    }

    sentry.cooldownTimer = Math.max(0, sentry.cooldownTimer - dt);
    if (
      sentry.cooldownTimer === 0 &&
      Math.abs(state.player.x - sentry.x) <=
        movement.shadowSentry.activationRange
    ) {
      sentry.telegraphTimer = movement.shadowSentry.telegraphTime;
    }
  }
}

function fireShadowWave(
  state: GameState,
  sentry: ShadowSentry,
  sourceIndex: number,
): void {
  const direction: -1 | 1 = state.player.x < sentry.x ? -1 : 1;
  sentry.pulseCount += 1;
  state.shadowWaves.push({
    id: state.nextShadowWaveId++,
    x:
      sentry.x +
      direction * (SHADOW_SENTRY_WIDTH * 0.5 + SHADOW_WAVE_WIDTH * 0.5),
    y: sentry.y,
    vx: direction * movement.shadowSentry.waveSpeed,
    ttl: movement.shadowSentry.waveLifetime,
    sourceIndex,
  });
  addBurst(
    state,
    "pulse",
    sentry.x,
    sentry.y - SHADOW_SENTRY_HEIGHT * 0.45,
    direction,
  );
}

function updateShadowWaves(state: GameState, dt: number): void {
  let hitWaveId: number | null = null;
  for (const wave of state.shadowWaves) {
    const previousX = wave.x;
    wave.x += wave.vx * dt;
    wave.ttl -= dt;
    if (wave.ttl <= 0 || wave.x < 0 || wave.x > state.worldWidth) continue;

    const mountainDashing =
      state.player.form === "mountain" && state.player.dashTimer > 0;
    if (
      !mountainDashing &&
      playerOverlapsShadowWave(state.player, previousX, wave)
    ) {
      hitWaveId = wave.id;
      state.player.shadowWaveHitCount += 1;
      addBurst(
        state,
        "hit",
        state.player.x,
        state.player.y - PLAYER_HEIGHT * 0.5,
        state.player.facing,
      );
      resetPlayerToCheckpoint(state);
      break;
    }
  }
  state.shadowWaves = state.shadowWaves.filter(
    (wave) =>
      wave.id !== hitWaveId &&
      wave.ttl > 0 &&
      wave.x >= 0 &&
      wave.x <= state.worldWidth,
  );
}

function playerOverlapsShadowWave(
  player: Player,
  previousWaveX: number,
  wave: ShadowWave,
): boolean {
  const sweptLeft =
    Math.min(previousWaveX, wave.x) - SHADOW_WAVE_WIDTH * 0.5;
  const sweptRight =
    Math.max(previousWaveX, wave.x) + SHADOW_WAVE_WIDTH * 0.5;
  const verticalOverlap =
    player.y > wave.y - SHADOW_WAVE_HEIGHT &&
    player.y - PLAYER_HEIGHT < wave.y;
  return (
    player.x + PLAYER_HALF_WIDTH > sweptLeft &&
    player.x - PLAYER_HALF_WIDTH < sweptRight &&
    verticalOverlap
  );
}

function dispelWavesFromEarthSlam(state: GameState): number {
  const impactX = state.player.x;
  const impactY = state.player.y;
  const radiusSquared =
    EARTH_SLAM_SHOCKWAVE_RADIUS * EARTH_SLAM_SHOCKWAVE_RADIUS;
  const remaining: ShadowWave[] = [];
  let dispelledCount = 0;

  for (const wave of state.shadowWaves) {
    const closestX = clamp(
      impactX,
      wave.x - SHADOW_WAVE_WIDTH * 0.5,
      wave.x + SHADOW_WAVE_WIDTH * 0.5,
    );
    const closestY = clamp(
      impactY,
      wave.y - SHADOW_WAVE_HEIGHT,
      wave.y,
    );
    const dx = impactX - closestX;
    const dy = impactY - closestY;
    if (dx * dx + dy * dy > radiusSquared) {
      remaining.push(wave);
      continue;
    }
    dispelledCount += 1;
    addBurst(state, "dispel", wave.x, wave.y - SHADOW_WAVE_HEIGHT * 0.5, state.player.facing);
  }

  state.shadowWaves = remaining;
  return dispelledCount;
}

function defeatShadowSentry(
  state: GameState,
  sentry: ShadowSentry,
  sentryIndex: number,
): void {
  sentry.defeated = true;
  sentry.telegraphTimer = 0;
  sentry.cooldownTimer = 0;
  state.shadowWaves = state.shadowWaves.filter(
    (wave) => wave.sourceIndex !== sentryIndex,
  );
}

function playerOverlapsSentry(
  player: Player,
  previousX: number,
  sentry: ShadowSentry,
): boolean {
  const left = sentry.x - SHADOW_SENTRY_WIDTH * 0.5;
  const right = sentry.x + SHADOW_SENTRY_WIDTH * 0.5;
  const sweptLeft = Math.min(previousX, player.x) - PLAYER_HALF_WIDTH;
  const sweptRight = Math.max(previousX, player.x) + PLAYER_HALF_WIDTH;
  const verticalOverlap =
    player.y > sentry.y - SHADOW_SENTRY_HEIGHT &&
    player.y - PLAYER_HEIGHT < sentry.y;
  return sweptRight > left && sweptLeft < right && verticalOverlap;
}

function distanceSquaredToSentry(
  x: number,
  y: number,
  sentry: ShadowSentry,
): number {
  const closestX = clamp(
    x,
    sentry.x - SHADOW_SENTRY_WIDTH * 0.5,
    sentry.x + SHADOW_SENTRY_WIDTH * 0.5,
  );
  const closestY = clamp(y, sentry.y - SHADOW_SENTRY_HEIGHT, sentry.y);
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy;
}

function resetPlayerToCheckpoint(state: GameState): void {
  const player = state.player;
  player.x = state.checkpoint.x;
  player.y = state.checkpoint.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.wallSide = 0;
  player.dashAvailable = true;
  player.dashTimer = 0;
  player.anchorCooldown = 0;
  player.earthSlamming = false;
  player.gliding = false;
  player.jumpBufferTimer = 0;
  player.jumpHoldTimer = 0;
  player.coyoteTimer = 0;
  player.attackTimer = 0;
  state.shadowWaves = [];
}

export function isFinishReady(state: GameState): boolean {
  return (
    state.sigils.every((sigil) => sigil.collected) &&
    state.shadowSentries.every((sentry) => sentry.defeated)
  );
}

export function findUsableWindAnchorIndex(state: GameState): number | null {
  const player = state.player;
  if (player.form !== "wind" || player.anchorCooldown > 0) return null;

  const centerY = player.y - PLAYER_HEIGHT * 0.5;
  const radiusSquared = movement.windAnchor.radius * movement.windAnchor.radius;
  let nearestIndex: number | null = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;
  for (let index = 0; index < state.windAnchors.length; index += 1) {
    const anchor = state.windAnchors[index]!;
    const dx = anchor.x - player.x;
    const dy = anchor.y - centerY;
    const distanceSquared = dx * dx + dy * dy;
    if (
      distanceSquared <= radiusSquared &&
      distanceSquared < nearestDistanceSquared
    ) {
      nearestIndex = index;
      nearestDistanceSquared = distanceSquared;
    }
  }
  return nearestIndex;
}

function findPlatformBelow(
  platforms: Platform[],
  x: number,
  y: number,
): Platform | undefined {
  return platforms
    .filter(
      (platform) =>
        x >= platform.x && x <= platform.x + platform.width && platform.y >= y,
    )
    .sort((a, b) => a.y - b.y)[0];
}

function verticalOverlap(playerY: number, platform: Platform): boolean {
  return (
    playerY > platform.y &&
    playerY - PLAYER_HEIGHT < platform.y + platform.height
  );
}

function horizontalOverlap(playerX: number, platform: Platform): boolean {
  return (
    playerX + PLAYER_HALF_WIDTH > platform.x &&
    playerX - PLAYER_HALF_WIDTH < platform.x + platform.width
  );
}

function addBurst(
  state: GameState,
  kind: BurstKind,
  x: number,
  y: number,
  facing: -1 | 1,
): void {
  state.bursts.push({
    id: state.nextBurstId++,
    kind,
    x,
    y,
    facing,
    ttl: kind === "sigil" || kind === "shockwave" ? 0.65 : 0.3,
  });
}

function dashSpeedFor(form: PlayerForm): number {
  return form === "mountain"
    ? movement.mountainForm.dashSpeed
    : movement.dashSpeed;
}

function tickBursts(state: GameState, dt: number): void {
  for (const burst of state.bursts) burst.ttl -= dt;
  state.bursts = state.bursts.filter((burst) => burst.ttl > 0);
}

function approach(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return target;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
