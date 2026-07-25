import Phaser from "phaser";
import {
  createGame,
  emptyInput,
  step,
  FIXED_DT,
  type Enemy,
  type GameState,
  type Input,
} from "../sim/index";

declare global {
  interface Window {
    __LANKA_STATE__: GameState;
  }
}

const WIDTH = 960;
const HEIGHT = 540;

class GameScene extends Phaser.Scene {
  private state!: GameState;
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private actorGraphics!: Phaser.GameObjects.Graphics;
  private effectGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private accumulator = 0;
  private cameraX = 0;

  constructor() {
    super("game");
  }

  create(): void {
    const seedText = new URLSearchParams(location.search).get("seed");
    const seed = seedText ? Number(seedText) : 108;
    this.state = createGame(Number.isFinite(seed) ? seed : 108);
    window.__LANKA_STATE__ = this.state;

    this.worldGraphics = this.add.graphics();
    this.actorGraphics = this.add.graphics();
    this.effectGraphics = this.add.graphics();
    this.uiGraphics = this.add.graphics();

    this.titleText = this.add
      .text(WIDTH / 2, 20, "FLAME OF LANKA", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#f4c477",
        stroke: "#351406",
        strokeThickness: 4,
        letterSpacing: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.statusText = this.add
      .text(WIDTH / 2, HEIGHT / 2 - 42, "", {
        fontFamily: "Georgia, serif",
        fontSize: "48px",
        fontStyle: "bold",
        align: "center",
        color: "#ffd38a",
        stroke: "#190804",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(11);

    this.hintText = this.add
      .text(WIDTH / 2, HEIGHT - 23, "MOVE  A D / ← →    JUMP  W / SPACE    LIGHT  J    HEAVY  K", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#e8cba2",
        backgroundColor: "#120b09bb",
        padding: { x: 12, y: 7 },
      })
      .setOrigin(0.5, 1)
      .setDepth(10);

    this.keys = this.input.keyboard!.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      k: Phaser.Input.Keyboard.KeyCodes.K,
      r: Phaser.Input.Keyboard.KeyCodes.R,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.draw();
  }

  override update(_time: number, deltaMs: number): void {
    const input = this.readInput();
    this.accumulator += Math.min(deltaMs, 50) / 1000;
    let firstStep = true;
    while (this.accumulator >= FIXED_DT) {
      this.state = step(this.state, firstStep ? input : heldOnly(input), FIXED_DT);
      firstStep = false;
      this.accumulator -= FIXED_DT;
    }
    window.__LANKA_STATE__ = this.state;

    const targetCamera = Phaser.Math.Clamp(this.state.player.x - WIDTH * 0.34, 0, this.state.worldWidth - WIDTH);
    this.cameraX = Phaser.Math.Linear(this.cameraX, targetCamera, 0.085);
    this.draw();
  }

  private readInput(): Input {
    const left = this.keys.left!.isDown || this.keys.a!.isDown;
    const right = this.keys.right!.isDown || this.keys.d!.isDown;
    const input = emptyInput();
    input.moveX = left === right ? 0 : left ? -1 : 1;
    input.jump =
      Phaser.Input.Keyboard.JustDown(this.keys.up!) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w!) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space!);
    input.light = Phaser.Input.Keyboard.JustDown(this.keys.j!);
    input.heavy = Phaser.Input.Keyboard.JustDown(this.keys.k!);
    input.restart = Phaser.Input.Keyboard.JustDown(this.keys.r!);
    return input;
  }

  private draw(): void {
    const shake =
      this.state.shakeTimer > 0 ? Math.sin(this.state.tick * 2.7) * this.state.shakeTimer * 18 : 0;
    const cameraX = this.cameraX - shake;
    this.drawWorld(cameraX);
    this.drawActors(cameraX);
    this.drawEffects(cameraX);
    this.drawUi();
  }

  private drawWorld(cameraX: number): void {
    const g = this.worldGraphics.clear();

    g.fillGradientStyle(0x080c16, 0x080c16, 0x25100c, 0x3a150a, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    const moonX = 725 - cameraX * 0.04;
    g.fillStyle(0xd8dde0, 0.92);
    g.fillCircle(moonX, 91, 43);
    g.fillStyle(0xaeb5bb, 0.3);
    g.fillCircle(moonX - 13, 78, 9);
    g.fillCircle(moonX + 16, 102, 12);
    g.fillStyle(0x111622, 0.7);
    g.fillCircle(moonX + 32, 75, 35);

    drawCloud(g, 170 - cameraX * 0.07, 108, 1.3);
    drawCloud(g, 560 - cameraX * 0.05, 145, 0.9);
    drawCloud(g, 920 - cameraX * 0.08, 92, 1.15);

    for (let layer = 0; layer < 3; layer += 1) {
      const parallax = 0.11 + layer * 0.08;
      const baseY = 285 + layer * 38;
      const color = [0x17131b, 0x22151a, 0x301815][layer]!;
      g.fillStyle(color, 1);
      for (let x = -120; x < this.state.worldWidth + 200; x += 130) {
        const sx = x - cameraX * parallax;
        const height = 55 + ((x / 10 + layer * 29) % 75 + 75) % 75;
        g.fillRect(sx, baseY - height, 92, height);
        g.fillTriangle(sx - 9, baseY - height, sx + 46, baseY - height - 42, sx + 101, baseY - height);
        if (layer === 2) {
          g.fillStyle(0xff6b18, 0.5);
          g.fillRect(sx + 18, baseY - height + 22, 5, 9);
          g.fillRect(sx + 60, baseY - height + 35, 5, 9);
          g.fillStyle(color, 1);
        }
      }
    }

    drawPalace(g, 560 - cameraX * 0.18, 306);
    drawPalace(g, 1550 - cameraX * 0.18, 318);
    drawPalace(g, 2440 - cameraX * 0.18, 296);

    for (let i = 0; i < 68; i += 1) {
      const worldX = (i * 173 + this.state.tick * (0.18 + (i % 4) * 0.05)) % 3200;
      const x = worldX - cameraX * 0.45;
      const y = 60 + ((i * 89 - this.state.tick * (0.21 + (i % 5) * 0.03)) % 360 + 360) % 360;
      const radius = 1 + (i % 3);
      g.fillStyle(i % 4 === 0 ? 0xffd06a : 0xff5a17, 0.55 + (i % 3) * 0.15);
      g.fillCircle(x, y, radius);
    }

    g.fillStyle(0x2a1a17, 1);
    g.fillRect(0, this.state.groundY, WIDTH, HEIGHT - this.state.groundY);
    g.fillStyle(0x60402b, 1);
    g.fillRect(0, this.state.groundY, WIDTH, 8);
    g.fillStyle(0x1b1110, 1);
    for (let x = -40 - (cameraX % 86); x < WIDTH + 86; x += 86) {
      g.fillRect(x, this.state.groundY + 12, 78, 28);
      g.fillRect(x + 32, this.state.groundY + 46, 79, 30);
    }
    g.lineStyle(2, 0x8a5932, 0.32);
    for (let x = -50 - (cameraX % 120); x < WIDTH + 100; x += 120) {
      g.lineBetween(x, this.state.groundY + 3, x + 18, this.state.groundY - 5);
      g.lineBetween(x + 40, this.state.groundY + 5, x + 62, this.state.groundY - 2);
    }

    const progress = Phaser.Math.Clamp(this.state.player.x / this.state.worldWidth, 0, 1);
    g.fillStyle(0x110a08, 0.85);
    g.fillRoundedRect(WIDTH - 174, 79, 142, 7, 3);
    g.fillStyle(0xf18425, 1);
    g.fillRoundedRect(WIDTH - 172, 81, 138 * progress, 3, 2);
  }

  private drawActors(cameraX: number): void {
    const g = this.actorGraphics.clear();
    const player = this.state.player;
    const px = player.x - cameraX;
    drawHero(g, px, player.y, player.facing, player.attackKind, player.attackTimer, player.invulnerableTimer);

    for (const enemy of this.state.enemies) {
      const x = enemy.x - cameraX;
      if (x < -140 || x > WIDTH + 140) continue;
      drawEnemy(g, x, enemy.y, enemy);
    }
  }

  private drawEffects(cameraX: number): void {
    const g = this.effectGraphics.clear();
    for (const effect of this.state.effects) {
      const x = effect.x - cameraX;
      const alpha = Phaser.Math.Clamp(effect.ttl * 5, 0, 1);
      if (effect.kind === "heavy-hit" || effect.kind === "light-hit") {
        const heavy = effect.kind === "heavy-hit";
        g.lineStyle(heavy ? 10 : 6, heavy ? 0xff8b23 : 0xffd06a, alpha);
        g.beginPath();
        g.arc(x - effect.facing * 24, effect.y, heavy ? 70 : 48, -1.1, 1.1, false);
        g.strokePath();
        g.fillStyle(0xfff1b3, alpha);
        for (let i = 0; i < (heavy ? 9 : 5); i += 1) {
          g.fillCircle(x + effect.facing * (i * 8), effect.y - 24 + i * 7, heavy ? 4 : 3);
        }
      } else if (effect.kind === "player-hit") {
        g.fillStyle(0xff2d18, alpha);
        g.fillCircle(x, effect.y, 28 * alpha);
      } else {
        g.lineStyle(5, 0xff6a18, alpha);
        for (let i = 0; i < 7; i += 1) {
          g.lineBetween(x, effect.y, x + (i - 3) * 14, effect.y - 20 - (i % 3) * 15);
        }
      }
    }
  }

  private drawUi(): void {
    const g = this.uiGraphics.clear();
    const healthRatio = this.state.player.health / this.state.player.maxHealth;

    g.fillStyle(0x080607, 0.88);
    g.fillRoundedRect(22, 20, 292, 70, 9);
    g.lineStyle(2, 0xb67a38, 0.8);
    g.strokeRoundedRect(22, 20, 292, 70, 9);
    g.fillStyle(0xd29a42, 1);
    g.fillCircle(57, 55, 23);
    g.fillStyle(0x3a1b12, 1);
    g.fillCircle(57, 58, 17);
    g.fillStyle(0xdaa257, 1);
    g.fillCircle(52, 53, 7);
    g.fillTriangle(60, 48, 70, 53, 61, 57);

    g.fillStyle(0x160b09, 1);
    g.fillRoundedRect(90, 42, 202, 19, 5);
    g.fillStyle(healthRatio > 0.28 ? 0xc52d1c : 0xef6a1f, 1);
    g.fillRoundedRect(93, 45, 196 * healthRatio, 13, 3);
    g.lineStyle(1, 0xffc86b, 0.8);
    g.strokeRoundedRect(90, 42, 202, 19, 5);

    const alive = this.state.enemies.filter((enemy) => enemy.health > 0).length;
    drawDiamond(g, WIDTH - 130, 41, 19);
    g.fillStyle(0x0b0809, 0.82);
    g.fillRoundedRect(WIDTH - 198, 66, 166, 37, 8);

    this.titleText.setText("FLAME OF LANKA");
    const status =
      this.state.status === "won"
        ? "LANKA CLEARED\nPRESS R TO FIGHT AGAIN"
        : this.state.status === "lost"
          ? "THE FLAME ENDURES\nPRESS R TO RISE AGAIN"
          : !this.state.started
            ? "PRESS A / D TO ENTER THE BATTLE"
            : "";
    this.statusText.setFontSize(this.state.started || this.state.status !== "playing" ? 48 : 25);
    this.statusText.setText(status);
    this.statusText.setVisible(status.length > 0);

    if (this.state.status !== "playing") {
      g.fillStyle(0x050307, 0.72);
      g.fillRect(0, 0, WIDTH, HEIGHT);
    }

    const scoreLabel = this.addOrReuseLabel("score", WIDTH - 47, 31, `SCORE  ${this.state.score}`, 14);
    scoreLabel.setOrigin(1, 0);
    const enemyLabel = this.addOrReuseLabel("enemies", WIDTH - 47, 75, `FOES  ${alive}`, 15);
    enemyLabel.setOrigin(1, 0);
    const hpLabel = this.addOrReuseLabel(
      "health",
      192,
      66,
      `${Math.ceil(this.state.player.health)} / ${this.state.player.maxHealth}`,
      13,
    );
    hpLabel.setOrigin(0.5, 0);
  }

  private addOrReuseLabel(name: string, x: number, y: number, value: string, size: number): Phaser.GameObjects.Text {
    const existing = this.children.getByName(name) as Phaser.GameObjects.Text | null;
    if (existing) return existing.setText(value);
    return this.add
      .text(x, y, value, {
        fontFamily: "Arial, sans-serif",
        fontSize: `${size}px`,
        fontStyle: "bold",
        color: "#f4d6a0",
      })
      .setName(name)
      .setDepth(12);
  }
}

function heldOnly(input: Input): Input {
  return { moveX: input.moveX, jump: false, light: false, heavy: false, restart: false };
}

function drawHero(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  facing: -1 | 1,
  attackKind: "light" | "heavy" | null,
  attackTimer: number,
  invulnerable: number,
): void {
  const flash = invulnerable > 0 && Math.floor(invulnerable * 20) % 2 === 0;
  const lift = attackKind === "heavy" ? Math.sin(attackTimer * 15) * 5 : 0;
  g.fillStyle(0x000000, 0.35);
  g.fillEllipse(x, y + 5, 88, 18);
  g.lineStyle(7, 0xa95722, flash ? 0.35 : 1);
  g.lineBetween(x - facing * 17, y - 42, x - facing * 43, y - 35);
  g.lineBetween(x - facing * 43, y - 35, x - facing * 55, y - 18);
  g.lineBetween(x - facing * 55, y - 18, x - facing * 39, y - 2);

  g.fillStyle(flash ? 0xfff2c4 : 0xc96c2c, 1);
  g.fillEllipse(x, y - 43 + lift, 45, 58);
  g.fillStyle(0xf1c07b, 1);
  g.fillCircle(x + facing * 6, y - 78 + lift, 19);
  g.fillTriangle(
    x + facing * 14,
    y - 82 + lift,
    x + facing * 31,
    y - 76 + lift,
    x + facing * 14,
    y - 71 + lift,
  );
  g.fillStyle(0x2a1712, 1);
  g.fillCircle(x + facing * 11, y - 81 + lift, 2.5);

  g.fillStyle(0xe7a938, 1);
  g.fillRect(x - 19, y - 58 + lift, 38, 8);
  g.fillTriangle(x - 19, y - 45 + lift, x, y - 24 + lift, x + 19, y - 45 + lift);
  g.fillStyle(0xa91e13, 1);
  g.fillTriangle(x - facing * 14, y - 55, x - facing * 45, y - 27, x - facing * 9, y - 36);

  g.lineStyle(9, 0xe9b878, 1);
  g.lineBetween(x - 10, y - 21, x - 16, y);
  g.lineBetween(x + 10, y - 21, x + 16, y);

  const swing = attackKind ? (attackKind === "heavy" ? 1.2 : 0.7) : -0.25;
  const angle = facing === 1 ? -swing : Math.PI + swing;
  const handX = x + Math.cos(angle) * 30;
  const handY = y - 54 + Math.sin(angle) * 30 + lift;
  const maceX = x + Math.cos(angle) * 74;
  const maceY = y - 54 + Math.sin(angle) * 74 + lift;
  g.lineStyle(7, 0xc58a36, 1);
  g.lineBetween(handX, handY, maceX, maceY);
  g.fillStyle(0xd39b42, 1);
  g.fillCircle(maceX, maceY, attackKind === "heavy" ? 20 : 16);
  g.lineStyle(2, 0x6c3e1c, 0.8);
  g.strokeCircle(maceX, maceY, attackKind === "heavy" ? 20 : 16);
}

function drawEnemy(g: Phaser.GameObjects.Graphics, x: number, y: number, enemy: Enemy): void {
  const alpha = enemy.health <= 0 ? Math.max(0.12, enemy.defeatedTimer * 1.8) : 1;
  const brute = enemy.kind === "brute";
  const scale = brute ? 1.2 : 0.92;
  const windup = enemy.attackTimer > 0;
  g.fillStyle(0x000000, 0.35 * alpha);
  g.fillEllipse(x, y + 5, 78 * scale, 17);
  g.fillStyle(brute ? 0x412447 : 0x56314d, alpha);
  g.fillEllipse(x, y - 39, 43 * scale, 62 * scale);
  g.fillStyle(0x342039, alpha);
  g.fillCircle(x, y - 78 * scale, 18 * scale);
  g.fillStyle(0xc99a43, alpha);
  g.fillTriangle(x - 16 * scale, y - 91 * scale, x - 4, y - 104 * scale, x - 1, y - 88 * scale);
  g.fillTriangle(x + 16 * scale, y - 91 * scale, x + 4, y - 104 * scale, x + 1, y - 88 * scale);
  g.fillStyle(windup ? 0xffdf58 : 0xff5b2d, alpha);
  g.fillCircle(x - 7 * scale, y - 80 * scale, 3 * scale);
  g.fillCircle(x + 7 * scale, y - 80 * scale, 3 * scale);
  g.fillStyle(0xb57a31, alpha);
  g.fillRect(x - 23 * scale, y - 57, 46 * scale, 8);

  g.lineStyle(brute ? 11 : 7, 0x3c2639, alpha);
  g.lineBetween(x - 13, y - 20, x - 17, y);
  g.lineBetween(x + 13, y - 20, x + 17, y);
  const weaponStartX = x + enemy.facing * 12;
  const weaponEndX = x + enemy.facing * (windup ? 58 : 43);
  const weaponEndY = y - (windup ? 78 : 43);
  g.lineStyle(brute ? 8 : 5, 0xb7a278, alpha);
  g.lineBetween(weaponStartX, y - 52, weaponEndX, weaponEndY);
  if (brute) {
    g.fillStyle(0x735b54, alpha);
    g.fillRect(weaponEndX - 12, weaponEndY - 12, 24, 24);
  } else {
    g.fillStyle(0xd3c4a3, alpha);
    g.fillTriangle(
      weaponEndX,
      weaponEndY - 18,
      weaponEndX + enemy.facing * 8,
      weaponEndY,
      weaponEndX - enemy.facing * 8,
      weaponEndY,
    );
  }

  if (enemy.health > 0 && enemy.health < enemy.maxHealth) {
    g.fillStyle(0x10090d, 0.9);
    g.fillRect(x - 27 * scale, y - 123 * scale, 54 * scale, 6);
    g.fillStyle(0xd6432b, 1);
    g.fillRect(x - 26 * scale, y - 122 * scale, 52 * scale * (enemy.health / enemy.maxHealth), 4);
  }
}

function drawCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  g.fillStyle(0x202633, 0.45);
  g.fillEllipse(x, y, 170 * scale, 42 * scale);
  g.fillCircle(x - 45 * scale, y - 8 * scale, 28 * scale);
  g.fillCircle(x + 30 * scale, y - 13 * scale, 34 * scale);
}

function drawPalace(g: Phaser.GameObjects.Graphics, x: number, baseY: number): void {
  g.fillStyle(0x35201e, 0.95);
  g.fillRect(x, baseY - 94, 210, 94);
  g.fillRect(x + 44, baseY - 151, 122, 151);
  g.fillRect(x + 83, baseY - 205, 45, 205);
  g.fillTriangle(x + 72, baseY - 205, x + 105, baseY - 239, x + 138, baseY - 205);
  g.fillStyle(0xff6b18, 0.65);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      g.fillRect(x + 23 + col * 39, baseY - 31 - row * 28, 7, 12);
    }
  }
  g.fillStyle(0xff8c20, 0.75);
  g.fillTriangle(x + 91, baseY - 219, x + 104, baseY - 257, x + 115, baseY - 219);
}

function drawDiamond(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
  g.fillStyle(0x1b0d09, 1);
  g.fillPoints(
    [
      new Phaser.Geom.Point(x, y - size),
      new Phaser.Geom.Point(x + size, y),
      new Phaser.Geom.Point(x, y + size),
      new Phaser.Geom.Point(x - size, y),
    ],
    true,
  );
  g.lineStyle(2, 0xd09138, 1);
  g.strokePoints(
    [
      new Phaser.Geom.Point(x, y - size),
      new Phaser.Geom.Point(x + size, y),
      new Phaser.Geom.Point(x, y + size),
      new Phaser.Geom.Point(x - size, y),
    ],
    true,
  );
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#070a10",
  render: { antialias: true, pixelArt: false },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
});
