import balance from "../../content/design/balance.json";
import { makeRng, type Rng } from "./rng";

export const FIXED_DT = 1 / 60;
const GRAVITY = 1650;

export type GameStatus = "playing" | "won" | "lost";
export type AttackKind = "light" | "heavy";
export type EnemyKind = "raider" | "brute";
export type EffectKind = "light-hit" | "heavy-hit" | "player-hit" | "defeat";

export interface Input {
  moveX: -1 | 0 | 1;
  jump: boolean;
  light: boolean;
  heavy: boolean;
  restart: boolean;
}

export interface Fighter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: -1 | 1;
  health: number;
  maxHealth: number;
}

export interface Player extends Fighter {
  onGround: boolean;
  attackKind: AttackKind | null;
  attackTimer: number;
  attackCooldown: number;
  attackSerial: number;
  invulnerableTimer: number;
}

export interface Enemy extends Fighter {
  id: number;
  kind: EnemyKind;
  active: boolean;
  attackTimer: number;
  attackCooldown: number;
  lastHitSerial: number;
  defeatedTimer: number;
}

export interface Effect {
  id: number;
  kind: EffectKind;
  x: number;
  y: number;
  facing: -1 | 1;
  ttl: number;
}

export interface GameState {
  seed: number;
  tick: number;
  started: boolean;
  status: GameStatus;
  worldWidth: number;
  groundY: number;
  player: Player;
  enemies: Enemy[];
  effects: Effect[];
  rng: Rng;
  nextEffectId: number;
  score: number;
  shakeTimer: number;
  statusTimer: number;
}

const enemyLayout: Array<{ x: number; kind: EnemyKind }> = [
  { x: 650, kind: "raider" },
  { x: 910, kind: "raider" },
  { x: 1240, kind: "brute" },
  { x: 1590, kind: "raider" },
  { x: 1860, kind: "raider" },
  { x: 2240, kind: "brute" },
];

export function emptyInput(): Input {
  return { moveX: 0, jump: false, light: false, heavy: false, restart: false };
}

export function createGame(seed: number): GameState {
  return {
    seed,
    tick: 0,
    started: false,
    status: "playing",
    worldWidth: balance.worldWidth,
    groundY: balance.groundY,
    player: {
      x: 180,
      y: balance.groundY,
      vx: 0,
      vy: 0,
      facing: 1,
      health: balance.player.maxHealth,
      maxHealth: balance.player.maxHealth,
      onGround: true,
      attackKind: null,
      attackTimer: 0,
      attackCooldown: 0,
      attackSerial: 0,
      invulnerableTimer: 0,
    },
    enemies: enemyLayout.map(({ x, kind }, index) => {
      const maxHealth =
        kind === "raider" ? balance.enemies.raiderHealth : balance.enemies.bruteHealth;
      return {
        id: index + 1,
        kind,
        x,
        y: balance.groundY,
        vx: 0,
        vy: 0,
        facing: -1,
        health: maxHealth,
        maxHealth,
        active: false,
        attackTimer: 0,
        attackCooldown: 0,
        lastHitSerial: -1,
        defeatedTimer: 0,
      };
    }),
    effects: [],
    rng: makeRng(seed),
    nextEffectId: 1,
    score: 0,
    shakeTimer: 0,
    statusTimer: 0,
  };
}

export function step(state: GameState, input: Input, dt: number): GameState {
  if (input.restart && state.status !== "playing") {
    return createGame(state.seed + 1);
  }

  state.tick += 1;
  tickEffects(state, dt);
  state.shakeTimer = Math.max(0, state.shakeTimer - dt);

  if (state.status !== "playing") {
    state.statusTimer += dt;
    return state;
  }

  if (!state.started) {
    state.started = input.moveX !== 0 || input.jump || input.light || input.heavy;
    if (!state.started) {
      if (state.player.health <= 0) state.status = "lost";
      return state;
    }
  }

  updatePlayer(state, input, dt);
  updateEnemies(state, dt);
  resolvePlayerAttack(state);

  if (state.player.health <= 0) {
    state.player.health = 0;
    state.status = "lost";
    state.statusTimer = 0;
    state.shakeTimer = 0.45;
  } else if (state.enemies.every((enemy) => enemy.health <= 0)) {
    state.status = "won";
    state.statusTimer = 0;
    state.score += 1000;
  }

  return state;
}

function updatePlayer(state: GameState, input: Input, dt: number): void {
  const player = state.player;
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.invulnerableTimer = Math.max(0, player.invulnerableTimer - dt);
  player.attackTimer = Math.max(0, player.attackTimer - dt);
  if (player.attackTimer === 0) player.attackKind = null;

  if (input.moveX !== 0) player.facing = input.moveX;
  const movementScale = player.attackKind === "heavy" ? 0.28 : player.attackKind ? 0.62 : 1;
  player.vx = input.moveX * balance.player.runSpeed * movementScale;

  if (input.jump && player.onGround) {
    player.vy = -balance.player.jumpSpeed;
    player.onGround = false;
  }

  if (player.attackKind === null && player.attackCooldown === 0) {
    if (input.heavy) startAttack(player, "heavy");
    else if (input.light) startAttack(player, "light");
  }

  player.vy += GRAVITY * dt;
  player.x = clamp(player.x + player.vx * dt, 35, state.worldWidth - 35);
  player.y += player.vy * dt;
  if (player.y >= state.groundY) {
    player.y = state.groundY;
    player.vy = 0;
    player.onGround = true;
  }
}

function startAttack(player: Player, kind: AttackKind): void {
  player.attackKind = kind;
  player.attackTimer = kind === "light" ? 0.24 : 0.48;
  player.attackCooldown = kind === "light" ? 0.3 : 0.68;
  player.attackSerial += 1;
}

function resolvePlayerAttack(state: GameState): void {
  const player = state.player;
  if (!player.attackKind || !isAttackActive(player)) return;

  const heavy = player.attackKind === "heavy";
  const range = heavy ? 132 : 96;
  const damage = heavy ? balance.player.heavyDamage : balance.player.lightDamage;

  for (const enemy of state.enemies) {
    if (enemy.health <= 0 || enemy.lastHitSerial === player.attackSerial) continue;
    const dx = enemy.x - player.x;
    const inFront = Math.sign(dx || player.facing) === player.facing;
    if (!inFront || Math.abs(dx) > range || Math.abs(enemy.y - player.y) > 75) continue;

    enemy.lastHitSerial = player.attackSerial;
    enemy.health = Math.max(0, enemy.health - damage);
    enemy.x += player.facing * (heavy ? 58 : 30);
    enemy.attackTimer = 0;
    enemy.attackCooldown = Math.max(enemy.attackCooldown, heavy ? 0.75 : 0.42);
    addEffect(state, heavy ? "heavy-hit" : "light-hit", enemy.x, enemy.y - 55, player.facing);
    state.shakeTimer = heavy ? 0.22 : 0.09;
    state.score += heavy ? 25 : 15;

    if (enemy.health === 0) {
      enemy.defeatedTimer = 0.55;
      state.score += enemy.kind === "brute" ? 250 : 100;
      addEffect(state, "defeat", enemy.x, enemy.y - 40, player.facing);
    }
  }
}

function isAttackActive(player: Player): boolean {
  if (player.attackKind === "light") {
    return player.attackTimer <= 0.17 && player.attackTimer >= 0.07;
  }
  return player.attackTimer <= 0.31 && player.attackTimer >= 0.14;
}

function updateEnemies(state: GameState, dt: number): void {
  for (const enemy of state.enemies) {
    if (enemy.health <= 0) {
      enemy.defeatedTimer = Math.max(0, enemy.defeatedTimer - dt);
      continue;
    }

    const dx = state.player.x - enemy.x;
    if (Math.abs(dx) < 660) enemy.active = true;
    if (!enemy.active) continue;

    enemy.facing = dx >= 0 ? 1 : -1;
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    const range = enemy.kind === "brute" ? 82 : 66;
    const speed = enemy.kind === "brute" ? 70 : 116;

    if (enemy.attackTimer > 0) {
      const previous = enemy.attackTimer;
      enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
      enemy.vx = 0;
      if (previous > 0 && enemy.attackTimer === 0) {
        tryEnemyHit(state, enemy, range + 18);
      }
    } else if (Math.abs(dx) > range) {
      enemy.vx = enemy.facing * speed;
      enemy.x = clamp(enemy.x + enemy.vx * dt, 35, state.worldWidth - 35);
    } else if (enemy.attackCooldown === 0) {
      enemy.vx = 0;
      enemy.attackTimer = enemy.kind === "brute" ? 0.62 : 0.38;
      enemy.attackCooldown = enemy.kind === "brute" ? 1.55 : 1.05;
    } else {
      enemy.vx = 0;
    }
  }
}

function tryEnemyHit(state: GameState, enemy: Enemy, range: number): void {
  const player = state.player;
  if (player.invulnerableTimer > 0 || Math.abs(player.y - enemy.y) > 74) return;
  if (Math.abs(player.x - enemy.x) > range) return;

  const damage =
    enemy.kind === "brute" ? balance.enemies.bruteDamage : balance.enemies.raiderDamage;
  player.health = Math.max(0, player.health - damage);
  player.invulnerableTimer = 0.62;
  player.x = clamp(player.x + enemy.facing * 52, 35, state.worldWidth - 35);
  player.vy = -170;
  player.onGround = false;
  addEffect(state, "player-hit", player.x, player.y - 55, enemy.facing);
  state.shakeTimer = enemy.kind === "brute" ? 0.28 : 0.16;
}

function addEffect(
  state: GameState,
  kind: EffectKind,
  x: number,
  y: number,
  facing: -1 | 1,
): void {
  state.effects.push({
    id: state.nextEffectId++,
    kind,
    x,
    y,
    facing,
    ttl: kind === "defeat" ? 0.6 : 0.24,
  });
}

function tickEffects(state: GameState, dt: number): void {
  for (const effect of state.effects) effect.ttl -= dt;
  state.effects = state.effects.filter((effect) => effect.ttl > 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
