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
  | "hit";

export interface Input {
  moveX: -1 | 0 | 1;
  jumpPressed: boolean;
  jumpHeld: boolean;
  dashPressed: boolean;
  formPressed: boolean;
  powerPressed: boolean;
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
    },
    platforms: course.platforms.map((platform) => ({ ...platform })),
    sigils: course.sigils.map((sigil) => ({ ...sigil, collected: false })),
    seals: course.seals.map((seal) => ({ ...seal, broken: false })),
    windAnchors: course.windAnchors.map((anchor) => ({ ...anchor })),
    shadowSentries: course.shadowSentries.map((sentry) => ({
      ...sentry,
      defeated: false,
    })),
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
    input.powerPressed;
  if (!state.started && !isAction) return state;
  state.started = true;
  state.elapsed += dt;

  updatePlayer(state, input, dt);
  collectSigils(state);

  if (
    state.sigils.every((sigil) => sigil.collected) &&
    !state.player.earthSlamming &&
    state.player.x >= state.finish.x - 58
  ) {
    state.status = "won";
    state.statusTimer = 0;
    addBurst(state, "sigil", state.finish.x, state.finish.y - 70, 1);
  }

  return state;
}

function updatePlayer(state: GameState, input: Input, dt: number): void {
  const player = state.player;
  const powerForm =
    !input.formPressed && !player.earthSlamming ? player.form : null;
  if (input.moveX !== 0 && !player.earthSlamming) {
    player.facing = input.moveX;
  }
  player.anchorCooldown = Math.max(0, player.anchorCooldown - dt);

  if (input.formPressed && !player.earthSlamming) {
    player.form = player.form === "wind" ? "mountain" : "wind";
    player.formShiftCount += 1;
    player.gliding = false;
    addBurst(state, "transform", player.x, player.y - 24, player.facing);
  }

  if (input.jumpPressed) player.jumpBufferTimer = movement.jumpBufferTime;
  else player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);

  if (player.onGround) player.coyoteTimer = movement.coyoteTime;
  else player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);

  const powered =
    input.powerPressed &&
    (powerForm === "wind"
      ? tryWindVault(state, input)
      : powerForm === "mountain"
        ? tryEarthSlam(state)
        : false);

  if (
    !powered &&
    !player.earthSlamming &&
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
  player.dashTimer = Math.max(0, player.dashTimer - dt);

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
  for (const sentry of state.shadowSentries) {
    if (
      sentry.defeated ||
      distanceSquaredToSentry(state.player.x, state.player.y, sentry) >
        EARTH_SLAM_SHOCKWAVE_RADIUS * EARTH_SLAM_SHOCKWAVE_RADIUS
    ) {
      continue;
    }
    sentry.defeated = true;
    defeatedCount += 1;
    addBurst(
      state,
      "defeat",
      sentry.x,
      sentry.y - SHADOW_SENTRY_HEIGHT * 0.5,
      state.player.facing,
    );
  }
  return defeatedCount;
}

function resolveShadowSentryContacts(
  state: GameState,
  previousX: number,
  mountainDashing: boolean,
): void {
  const player = state.player;
  for (const sentry of state.shadowSentries) {
    if (sentry.defeated || !playerOverlapsSentry(player, previousX, sentry)) {
      continue;
    }

    if (mountainDashing) {
      sentry.defeated = true;
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
