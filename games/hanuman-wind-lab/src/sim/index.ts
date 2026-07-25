import movement from "../../content/design/movement.json";
import course from "../../content/design/course.json";
import { makeRng, type Rng } from "./rng";

export const FIXED_DT = 1 / 60;
export const PLAYER_HALF_WIDTH = 15;
export const PLAYER_HEIGHT = 48;

export type GameStatus = "playing" | "won";
export type BurstKind = "jump" | "dash" | "land" | "sigil" | "fall";

export interface Input {
  moveX: -1 | 0 | 1;
  jumpPressed: boolean;
  jumpHeld: boolean;
  dashPressed: boolean;
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
  jumpHoldTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  gliding: boolean;
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
      jumpHoldTimer: 0,
      coyoteTimer: movement.coyoteTime,
      jumpBufferTimer: 0,
      gliding: false,
    },
    platforms: course.platforms.map((platform) => ({ ...platform })),
    sigils: course.sigils.map((sigil) => ({ ...sigil, collected: false })),
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
    input.moveX !== 0 || input.jumpPressed || input.jumpHeld || input.dashPressed;
  if (!state.started && !isAction) return state;
  state.started = true;
  state.elapsed += dt;

  updatePlayer(state, input, dt);
  collectSigils(state);

  if (
    state.sigils.every((sigil) => sigil.collected) &&
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
  if (input.moveX !== 0) player.facing = input.moveX;

  if (input.jumpPressed) player.jumpBufferTimer = movement.jumpBufferTime;
  else player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);

  if (player.onGround) player.coyoteTimer = movement.coyoteTime;
  else player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);

  if (input.dashPressed && player.dashAvailable && !player.onGround) {
    player.dashTimer = movement.dashDuration;
    player.dashAvailable = false;
    player.vx = player.facing * movement.dashSpeed;
    player.vy = 0;
    addBurst(state, "dash", player.x, player.y - 24, player.facing);
  }

  const canGroundJump = player.onGround || player.coyoteTimer > 0;
  if (player.jumpBufferTimer > 0 && (canGroundJump || player.wallSide !== 0)) {
    if (player.wallSide !== 0 && !player.onGround) {
      player.vx = -player.wallSide * movement.wallJumpX;
      player.facing = player.wallSide === 1 ? -1 : 1;
    }
    player.vy = -movement.jumpSpeed;
    player.onGround = false;
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;
    player.jumpHoldTimer = movement.jumpHoldTime;
    player.dashAvailable = true;
    addBurst(state, "jump", player.x, player.y, player.facing);
  }

  if (player.dashTimer > 0) {
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    player.vx = player.facing * movement.dashSpeed;
    player.vy = 0;
  } else {
    const acceleration = player.onGround
      ? movement.groundAcceleration
      : movement.airAcceleration;
    const targetVx = input.moveX * movement.runSpeed;
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

    player.gliding = input.jumpHeld && player.vy > 20 && !player.onGround;
    const gravity = player.gliding ? movement.gravity * 0.2 : movement.gravity;
    player.vy = Math.min(player.vy + gravity * dt, movement.maxFallSpeed);
    if (player.gliding) player.vy = Math.min(player.vy, movement.glideFallSpeed);
  }

  moveAndCollide(state, dt);

  if (player.y > state.worldHeight) {
    state.falls += 1;
    addBurst(state, "fall", player.x, state.worldHeight - 12, player.facing);
    player.x = state.checkpoint.x;
    player.y = state.checkpoint.y;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.wallSide = 0;
    player.dashAvailable = true;
    player.dashTimer = 0;
  }
}

function moveAndCollide(state: GameState, dt: number): void {
  const player = state.player;
  const previousX = player.x;
  const previousY = player.y;
  let nextX = clamp(previousX + player.vx * dt, PLAYER_HALF_WIDTH, state.worldWidth - PLAYER_HALF_WIDTH);
  player.wallSide = 0;

  for (const platform of state.platforms) {
    if (platform.height <= 20) continue;
    if (!verticalOverlap(previousY, platform)) continue;
    const previousRight = previousX + PLAYER_HALF_WIDTH;
    const nextRight = nextX + PLAYER_HALF_WIDTH;
    const previousLeft = previousX - PLAYER_HALF_WIDTH;
    const nextLeft = nextX - PLAYER_HALF_WIDTH;

    if (player.vx > 0 && previousRight <= platform.x && nextRight >= platform.x) {
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
  player.x = nextX;

  const nextY = previousY + player.vy * dt;
  let landedY: number | null = null;
  let ceilingY: number | null = null;

  for (const platform of state.platforms) {
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
        ceilingY = ceilingY === null ? platformBottom : Math.max(ceilingY, platformBottom);
      }
    }
  }

  const wasOnGround = player.onGround;
  if (landedY !== null) {
    player.y = landedY;
    player.vy = 0;
    player.onGround = true;
    player.gliding = false;
    player.dashAvailable = true;
    if (!wasOnGround) addBurst(state, "land", player.x, player.y, player.facing);
  } else if (ceilingY !== null) {
    player.y = ceilingY + PLAYER_HEIGHT;
    player.vy = Math.max(0, player.vy);
    player.onGround = false;
  } else {
    player.y = nextY;
    player.onGround = false;
  }

  if (player.wallSide !== 0 && !player.onGround && player.vy > movement.wallSlideSpeed) {
    player.vy = movement.wallSlideSpeed;
    player.dashAvailable = true;
  }
}

function collectSigils(state: GameState): void {
  for (const sigil of state.sigils) {
    if (sigil.collected) continue;
    const dx = state.player.x - sigil.x;
    const dy = state.player.y - PLAYER_HEIGHT * 0.5 - sigil.y;
    if (dx * dx + dy * dy > 100 * 100) continue;

    sigil.collected = true;
    state.player.dashAvailable = true;
    const checkpointPlatform = findPlatformBelow(state.platforms, sigil.x, sigil.y);
    if (checkpointPlatform) {
      state.checkpoint = {
        x: clamp(sigil.x, checkpointPlatform.x + 25, checkpointPlatform.x + checkpointPlatform.width - 25),
        y: checkpointPlatform.y,
      };
    }
    addBurst(state, "sigil", sigil.x, sigil.y, state.player.facing);
  }
}

function findPlatformBelow(
  platforms: Platform[],
  x: number,
  y: number,
): Platform | undefined {
  return platforms
    .filter((platform) => x >= platform.x && x <= platform.x + platform.width && platform.y >= y)
    .sort((a, b) => a.y - b.y)[0];
}

function verticalOverlap(playerY: number, platform: Platform): boolean {
  return playerY > platform.y && playerY - PLAYER_HEIGHT < platform.y + platform.height;
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
    ttl: kind === "sigil" ? 0.65 : 0.3,
  });
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
