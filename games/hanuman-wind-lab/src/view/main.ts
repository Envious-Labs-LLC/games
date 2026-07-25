import Phaser from "phaser";
import {
  createGame,
  emptyInput,
  step,
  FIXED_DT,
  type GameState,
  type Input,
  type Platform,
  type Seal,
} from "../sim/index";
import {
  bufferInput,
  consumeBufferedInput,
  createInputBuffer,
} from "../platform/inputBuffer";

declare global {
  interface Window {
    __WIND_STATE__: GameState;
  }
}

const WIDTH = 960;
const HEIGHT = 540;

class WindScene extends Phaser.Scene {
  private state!: GameState;
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private actorGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private centerText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private bufferedInput = createInputBuffer();
  private accumulator = 0;
  private cameraX = 0;
  private cameraY = 0;

  constructor() {
    super("wind");
  }

  create(): void {
    const seedText = new URLSearchParams(location.search).get("seed");
    const parsedSeed = seedText ? Number(seedText) : 205;
    this.state = createGame(Number.isFinite(parsedSeed) ? parsedSeed : 205);
    window.__WIND_STATE__ = this.state;

    this.worldGraphics = this.add.graphics();
    this.actorGraphics = this.add.graphics();
    this.fxGraphics = this.add.graphics();
    this.uiGraphics = this.add.graphics();

    this.titleText = this.add
      .text(WIDTH / 2, 17, "HANUMAN: WIND LAB", {
        fontFamily: "Georgia, serif",
        fontSize: "21px",
        fontStyle: "bold",
        color: "#fff1b4",
        stroke: "#133049",
        strokeThickness: 5,
        letterSpacing: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.centerText = this.add
      .text(WIDTH / 2, HEIGHT / 2 - 35, "", {
        fontFamily: "Georgia, serif",
        fontSize: "26px",
        fontStyle: "bold",
        align: "center",
        color: "#fff6ca",
        stroke: "#0b2740",
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.controlsText = this.add
      .text(
        WIDTH / 2,
        HEIGHT - 18,
        "MOVE  A / D    JUMP + GLIDE  SPACE    DASH  SHIFT    CHANGE FORM  E",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#e5f7ff",
          backgroundColor: "#07131dcc",
          padding: { x: 12, y: 7 },
        },
      )
      .setOrigin(0.5, 1)
      .setDepth(11);

    this.statsText = this.add
      .text(WIDTH - 25, 24, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        align: "right",
        color: "#e9faff",
        stroke: "#092038",
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setDepth(11);

    this.keys = this.input.keyboard!.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      r: Phaser.Input.Keyboard.KeyCodes.R,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.draw();
  }

  override update(_time: number, deltaMs: number): void {
    this.bufferedInput = bufferInput(this.bufferedInput, this.readInput());
    this.accumulator += Math.min(deltaMs, 50) / 1000;
    while (this.accumulator >= FIXED_DT) {
      this.state = step(this.state, consumeBufferedInput(this.bufferedInput), FIXED_DT);
      this.accumulator -= FIXED_DT;
    }
    window.__WIND_STATE__ = this.state;

    const targetX = Phaser.Math.Clamp(
      this.state.player.x - WIDTH * 0.34,
      0,
      this.state.worldWidth - WIDTH,
    );
    const targetY = Phaser.Math.Clamp(
      this.state.player.y - HEIGHT * 0.68,
      0,
      this.state.worldHeight - HEIGHT,
    );
    this.cameraX = Phaser.Math.Linear(this.cameraX, targetX, 0.08);
    this.cameraY = Phaser.Math.Linear(this.cameraY, targetY, 0.07);
    this.draw();
  }

  private readInput(): Input {
    const left = this.keys.left!.isDown || this.keys.a!.isDown;
    const right = this.keys.right!.isDown || this.keys.d!.isDown;
    const input = emptyInput();
    input.moveX = left === right ? 0 : left ? -1 : 1;
    input.jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.space!);
    input.jumpHeld = this.keys.space!.isDown;
    input.dashPressed = Phaser.Input.Keyboard.JustDown(this.keys.shift!);
    input.formPressed = Phaser.Input.Keyboard.JustDown(this.keys.e!);
    input.restart = Phaser.Input.Keyboard.JustDown(this.keys.r!);
    return input;
  }

  private draw(): void {
    this.drawWorld();
    this.drawActor();
    this.drawEffects();
    this.drawUi();
  }

  private drawWorld(): void {
    const g = this.worldGraphics.clear();
    g.fillGradientStyle(0x071525, 0x071525, 0x256986, 0x4d9ba3, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    g.fillStyle(0xf9f4c6, 0.88);
    g.fillCircle(760 - this.cameraX * 0.03, 91 - this.cameraY * 0.05, 38);
    g.fillStyle(0xd8f6f2, 0.16);
    g.fillCircle(760 - this.cameraX * 0.03, 91 - this.cameraY * 0.05, 57);

    for (let layer = 0; layer < 3; layer += 1) {
      const parallax = 0.05 + layer * 0.07;
      const baseY = 390 + layer * 45 - this.cameraY * parallax;
      const color = [0x183a51, 0x174b5c, 0x155961][layer]!;
      g.fillStyle(color, 0.9);
      for (let x = -180; x < this.state.worldWidth + 300; x += 290) {
        const sx = x - this.cameraX * parallax;
        const height = 120 + ((x / 10 + layer * 43) % 110 + 110) % 110;
        g.fillTriangle(sx - 100, baseY, sx + 40, baseY - height, sx + 180, baseY);
      }
    }

    for (let index = 0; index < 22; index += 1) {
      const x =
        ((index * 231 + this.state.tick * (0.35 + (index % 3) * 0.12)) %
          (WIDTH + 420)) -
        210;
      const y = 85 + ((index * 97) % 300);
      const length = 35 + (index % 4) * 18;
      g.lineStyle(1 + (index % 2), 0xc9fbff, 0.18 + (index % 3) * 0.08);
      g.lineBetween(x, y, x + length, y - 4);
    }

    drawCloud(g, 140 - this.cameraX * 0.11, 122 - this.cameraY * 0.04, 1);
    drawCloud(g, 610 - this.cameraX * 0.08, 170 - this.cameraY * 0.05, 0.78);
    drawCloud(g, 1120 - this.cameraX * 0.1, 105 - this.cameraY * 0.03, 1.2);

    for (const platform of this.state.platforms) drawPlatform(g, platform, this.cameraX, this.cameraY);
    for (const seal of this.state.seals) {
      if (!seal.broken) drawSeal(g, seal, this.cameraX, this.cameraY);
    }

    for (let index = 0; index < this.state.sigils.length; index += 1) {
      const sigil = this.state.sigils[index]!;
      const x = sigil.x - this.cameraX;
      const y = sigil.y - this.cameraY;
      if (x < -70 || x > WIDTH + 70) continue;
      if (sigil.collected) {
        g.lineStyle(2, 0x85edff, 0.2);
        g.strokeCircle(x, y, 15);
        continue;
      }
      const pulse = 1 + Math.sin((this.state.tick + index * 17) * 0.08) * 0.12;
      g.fillStyle(0x9cf7ff, 0.12);
      g.fillCircle(x, y, 30 * pulse);
      g.lineStyle(4, 0xa9f8ff, 0.95);
      g.strokeCircle(x, y, 16 * pulse);
      g.lineStyle(3, 0xffe68b, 1);
      g.beginPath();
      g.arc(x, y, 9, -1.2, 1.2, false);
      g.strokePath();
      g.fillStyle(0xfff3ad, 1);
      g.fillCircle(x + 9, y, 3);
    }

    drawShrine(
      g,
      this.state.finish.x - this.cameraX,
      this.state.finish.y - this.cameraY,
      this.state.sigils.every((sigil) => sigil.collected),
    );

    g.fillStyle(0x061321, 0.84);
    g.fillRect(0, HEIGHT - 64, WIDTH, 64);
    for (let wave = 0; wave < 16; wave += 1) {
      const x = wave * 75 - ((this.state.tick * 0.25) % 75);
      g.lineStyle(2, 0x62b8cb, 0.24);
      g.beginPath();
      g.arc(x, HEIGHT - 54, 35, Math.PI, Math.PI * 2, false);
      g.strokePath();
    }
  }

  private drawActor(): void {
    const g = this.actorGraphics.clear();
    const player = this.state.player;
    const x = player.x - this.cameraX;
    const y = player.y - this.cameraY;

    if (player.dashTimer > 0) {
      for (let trail = 4; trail >= 1; trail -= 1) {
        drawHero(g, x - player.facing * trail * 22, y, player, 0.1 + (4 - trail) * 0.08);
      }
    }
    drawHero(g, x, y, player, 1);
  }

  private drawEffects(): void {
    const g = this.fxGraphics.clear();
    for (const burst of this.state.bursts) {
      const x = burst.x - this.cameraX;
      const y = burst.y - this.cameraY;
      const alpha = Phaser.Math.Clamp(burst.ttl * 4, 0, 1);
      const count = burst.kind === "sigil" || burst.kind === "break" ? 12 : 7;
      const color =
        burst.kind === "fall"
          ? 0xffb45b
          : burst.kind === "break"
            ? 0xffc15e
            : burst.kind === "transform"
              ? 0xffe38b
              : 0xc5fbff;
      g.lineStyle(burst.kind === "dash" ? 4 : 3, color, alpha);
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count;
        const distance = (1 - alpha) * (burst.kind === "sigil" ? 75 : 42);
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        g.lineBetween(x + dx, y + dy, x + dx + Math.cos(angle) * 15, y + dy + Math.sin(angle) * 15);
      }
    }
  }

  private drawUi(): void {
    const g = this.uiGraphics.clear();
    const collected = this.state.sigils.filter((sigil) => sigil.collected).length;

    g.fillStyle(0x06131e, 0.82);
    g.fillRoundedRect(20, 18, 230, 72, 10);
    g.lineStyle(2, 0x86d9e8, 0.72);
    g.strokeRoundedRect(20, 18, 230, 72, 10);
    for (let index = 0; index < this.state.sigils.length; index += 1) {
      const active = this.state.sigils[index]!.collected;
      g.fillStyle(active ? 0xffe58b : 0x214354, active ? 1 : 0.8);
      g.fillCircle(45 + index * 28, 62, 8);
      if (active) {
        g.fillStyle(0xd9fbff, 1);
        g.fillCircle(45 + index * 28, 62, 3);
      }
    }

    g.fillStyle(0x071826, 0.8);
    g.fillRoundedRect(WIDTH - 188, 86, 163, 29, 8);
    g.fillStyle(this.state.player.dashAvailable ? 0x9ef6ff : 0x335463, 1);
    g.fillRoundedRect(WIDTH - 178, 96, this.state.player.dashAvailable ? 143 : 0, 9, 4);

    this.statsText.setText(
      `WIND SIGILS  ${collected} / ${this.state.sigils.length}\nTIME  ${formatTime(this.state.elapsed)}   FALLS  ${this.state.falls}\nFORM  ${this.state.player.form.toUpperCase()}`,
    );

    const centerMessage =
      this.state.status === "won"
        ? `THE WIND REMEMBERS\n${formatTime(this.state.elapsed)}  •  ${this.state.falls} FALLS\nPRESS R TO RUN AGAIN`
        : !this.state.started
          ? "PRESS A / D TO BEGIN THE LEAP"
          : collected === this.state.sigils.length
            ? "ALL SIGILS FOUND. REACH THE GOLDEN SHRINE."
            : "";
    this.centerText.setText(centerMessage);
    this.centerText.setVisible(centerMessage.length > 0);

    if (this.state.status === "won") {
      g.fillStyle(0x03101a, 0.7);
      g.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }
}

function drawHero(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  player: GameState["player"],
  alpha: number,
): void {
  const mountainForm = player.form === "mountain";
  const lean = player.dashTimer > 0 ? player.facing * 10 : player.vx * 0.015;
  const lift = player.gliding ? -8 : 0;
  g.fillStyle(0x03101a, 0.22 * alpha);
  g.fillEllipse(x, y + 4, mountainForm ? 76 : 62, mountainForm ? 16 : 12);

  if (mountainForm) {
    g.fillStyle(0xffb655, 0.12 * alpha);
    g.fillCircle(x, y - 29, 39);
  }

  g.lineStyle(5, 0xb76834, alpha);
  g.lineBetween(x - player.facing * 10, y - 31, x - player.facing * 34, y - 22);
  g.lineBetween(x - player.facing * 34, y - 22, x - player.facing * 43, y - 7);

  g.fillStyle(mountainForm ? 0xa94e25 : 0xc76e34, alpha);
  g.fillEllipse(
    x + lean * 0.15,
    y - 27 + lift,
    mountainForm ? 40 : 30,
    mountainForm ? 46 : 39,
  );
  g.fillStyle(0xf1c885, alpha);
  g.fillCircle(
    x + player.facing * 4 + lean * 0.25,
    y - 55 + lift,
    mountainForm ? 16 : 13,
  );
  g.fillTriangle(
    x + player.facing * 11,
    y - 59 + lift,
    x + player.facing * 23,
    y - 55 + lift,
    x + player.facing * 10,
    y - 49 + lift,
  );
  g.fillStyle(0x271b19, alpha);
  g.fillCircle(x + player.facing * 8, y - 57 + lift, 2);

  g.fillStyle(0xe9ad3d, alpha);
  g.fillRect(x - 14, y - 36 + lift, 28, 6);
  g.fillStyle(0xa92f26, alpha);
  const scarfLength = player.dashTimer > 0 ? 62 : player.gliding ? 50 : 32;
  g.fillTriangle(
    x - player.facing * 8,
    y - 42 + lift,
    x - player.facing * scarfLength,
    y - 50 + lift,
    x - player.facing * 13,
    y - 31 + lift,
  );

  g.lineStyle(7, 0xeac08a, alpha);
  if (player.gliding) {
    g.lineBetween(x - 11, y - 29, x - 25, y - 48);
    g.lineBetween(x + 11, y - 29, x + 25, y - 48);
    g.lineBetween(x - 9, y - 10, x - 17, y);
    g.lineBetween(x + 9, y - 10, x + 17, y);
  } else {
    const stride = Math.sin(player.x * 0.08) * (Math.abs(player.vx) > 20 ? 8 : 2);
    g.lineBetween(x - 9, y - 14, x - 12 - stride, y);
    g.lineBetween(x + 9, y - 14, x + 12 + stride, y);
  }

  if (player.wallSide !== 0) {
    g.lineStyle(3, 0xcffcff, 0.7);
    for (let index = 0; index < 3; index += 1) {
      g.lineBetween(
        x + player.wallSide * 19,
        y - 9 - index * 12,
        x + player.wallSide * 34,
        y - 14 - index * 12,
      );
    }
  }
}

function drawSeal(
  g: Phaser.GameObjects.Graphics,
  seal: Seal,
  cameraX: number,
  cameraY: number,
): void {
  const x = seal.x - cameraX;
  const y = seal.y - cameraY;
  if (x + seal.width < -80 || x > WIDTH + 80) return;
  g.fillStyle(0x314955, 0.95);
  g.fillRoundedRect(x, y, seal.width, seal.height, 5);
  g.lineStyle(3, 0xffc15e, 0.9);
  for (let offset = 18; offset < seal.height; offset += 36) {
    g.lineBetween(x + 3, y + offset, x + seal.width * 0.7, y + offset + 13);
    g.lineBetween(
      x + seal.width * 0.7,
      y + offset + 13,
      x + seal.width - 3,
      y + offset + 4,
    );
  }
}

function drawPlatform(
  g: Phaser.GameObjects.Graphics,
  platform: Platform,
  cameraX: number,
  cameraY: number,
): void {
  const x = platform.x - cameraX;
  const y = platform.y - cameraY;
  if (x + platform.width < -100 || x > WIDTH + 100) return;
  g.fillStyle(0x172f38, 1);
  g.fillRoundedRect(x, y, platform.width, platform.height, 7);
  g.fillStyle(0x3a776f, 1);
  g.fillRoundedRect(x, y, platform.width, Math.min(10, platform.height), 5);
  g.fillStyle(0x6eb49d, 0.45);
  for (let offset = 20; offset < platform.width; offset += 58) {
    g.fillTriangle(x + offset, y, x + offset + 10, y - 8, x + offset + 20, y);
  }
  g.lineStyle(2, 0x0c222b, 0.65);
  for (let offset = 26; offset < platform.width; offset += 72) {
    g.lineBetween(x + offset, y + 16, x + offset + 17, y + Math.min(48, platform.height - 3));
  }
}

function drawCloud(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  g.fillStyle(0xbbe9e7, 0.12);
  g.fillEllipse(x, y, 190 * scale, 39 * scale);
  g.fillCircle(x - 42 * scale, y - 8 * scale, 28 * scale);
  g.fillCircle(x + 31 * scale, y - 12 * scale, 34 * scale);
}

function drawShrine(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  active: boolean,
): void {
  const color = active ? 0xffdf72 : 0x496671;
  if (active) {
    g.fillStyle(0xffe38b, 0.12);
    g.fillCircle(x, y - 78, 65);
  }
  g.fillStyle(0x162c34, 1);
  g.fillRect(x - 44, y - 76, 88, 76);
  g.fillStyle(color, 1);
  g.fillTriangle(x - 57, y - 76, x, y - 125, x + 57, y - 76);
  g.fillStyle(0x06151e, 1);
  g.fillRect(x - 16, y - 56, 32, 56);
  g.lineStyle(4, color, 1);
  g.strokeCircle(x, y - 81, 18);
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainder}`;
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#071525",
  render: { antialias: true, pixelArt: false },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [WindScene],
});
