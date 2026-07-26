import Phaser from "phaser";
import movementContent from "../../content/design/movement.json";
import courseContent from "../../content/design/course.json";
import {
  createGame,
  EARTH_SLAM_SHOCKWAVE_RADIUS,
  emptyInput,
  findUsableWindAnchorIndex,
  GADA_STRIKE_REACH,
  GADA_STRIKE_TOTAL_TIME,
  isFinishReady,
  isGadaStrikeActive,
  SHADOW_SENTRY_HEIGHT,
  SHADOW_SENTRY_TELEGRAPH_TIME,
  SHADOW_SENTRY_WIDTH,
  SHADOW_WAVE_HEIGHT,
  SHADOW_WAVE_WIDTH,
  step,
  FIXED_DT,
  type GameState,
  type Input,
  type Platform,
  type Seal,
  type ShadowSentry,
  type ShadowWave,
  type WindAnchor,
} from "../sim/index";
import {
  bufferInput,
  consumeBufferedInput,
  createInputBuffer,
} from "../platform/inputBuffer";
import { GameAudio } from "./audio";

const mythicBackgroundUrl = new URL(
  "../../assets/source/backgrounds/leap-to-lanka-night.png",
  import.meta.url,
).href;
const hanumanWindUrl = new URL(
  "../../assets/source/characters/hanuman-wind.png",
  import.meta.url,
).href;
const hanumanRunAUrl = new URL(
  "../../assets/source/characters/hanuman-run-a.png",
  import.meta.url,
).href;
const hanumanRunMidUrl = new URL(
  "../../assets/source/characters/hanuman-run-mid.png",
  import.meta.url,
).href;
const hanumanRunBUrl = new URL(
  "../../assets/source/characters/hanuman-run-b.png",
  import.meta.url,
).href;
const hanumanAirUrl = new URL(
  "../../assets/source/characters/hanuman-air.png",
  import.meta.url,
).href;
const hanumanAttackWindupUrl = new URL(
  "../../assets/source/characters/hanuman-attack-windup.png",
  import.meta.url,
).href;
const hanumanAttackImpactUrl = new URL(
  "../../assets/source/characters/hanuman-attack-impact.png",
  import.meta.url,
).href;
const replayContentFingerprint = JSON.stringify({
  movement: movementContent,
  course: courseContent,
});

type HeroPose =
  | "idle"
  | "run-a"
  | "run-mid"
  | "run-b"
  | "air"
  | "attack-windup"
  | "attack-impact";

type AtmosphereDiagnostics = {
  reducedMotion: boolean;
  backgroundOffsetX: number;
  cloudOffsetX: number;
  mistOffsetX: number;
  cloudDrift: number;
  windStrength: number;
  templeLights: number;
  birds: number;
};

declare global {
  interface Window {
    __WIND_STATE__: GameState;
    __WIND_PAUSED__: boolean;
    __WIND_MUTED__: boolean;
    __WIND_CAPTURE__: {
      version: 1;
      seed: number;
      fixedDt: number;
      inputs: Input[];
      contentFingerprint: string;
      finalStateJson: string;
    };
    __WIND_EXPORT_CAPTURE__: () => string;
    __WIND_HERO_POSE__: HeroPose;
    __WIND_HERO_POSE_HISTORY__: HeroPose[];
    __WIND_HERO_TEXTURE__: string;
    __WIND_HERO_TEXTURE_HISTORY__: string[];
    __WIND_ATMOSPHERE__: AtmosphereDiagnostics;
  }
}

const WIDTH = 960;
const HEIGHT = 540;
const BACKDROP_HEIGHT = HEIGHT + 100;
const BACKDROP_WIDTH = BACKDROP_HEIGHT * (16 / 9);
const TEMPLE_LIGHTS = [
  { x: 0.626, y: 0.467, phase: 0.1, size: 1.8 },
  { x: 0.658, y: 0.443, phase: 1.7, size: 1.4 },
  { x: 0.69, y: 0.404, phase: 2.9, size: 1.6 },
  { x: 0.718, y: 0.37, phase: 4.1, size: 1.5 },
  { x: 0.746, y: 0.34, phase: 5.5, size: 2 },
  { x: 0.773, y: 0.404, phase: 0.8, size: 1.5 },
  { x: 0.798, y: 0.463, phase: 2.2, size: 1.4 },
  { x: 0.836, y: 0.57, phase: 3.6, size: 1.2 },
  { x: 0.868, y: 0.594, phase: 5, size: 1.5 },
] as const;

class WindScene extends Phaser.Scene {
  private state!: GameState;
  private backgroundImage!: Phaser.GameObjects.Image;
  private backdropAtmosphere!: Phaser.GameObjects.Graphics;
  private foregroundAtmosphere!: Phaser.GameObjects.Graphics;
  private heroImage!: Phaser.GameObjects.Image;
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
  private pointerAttackQueued = false;
  private paused = false;
  private audio = new GameAudio();
  private reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  constructor() {
    super("wind");
  }

  preload(): void {
    this.load.image("leap-to-lanka-night", mythicBackgroundUrl);
    this.load.image("hanuman-wind", hanumanWindUrl);
    this.load.image("hanuman-run-a", hanumanRunAUrl);
    this.load.image("hanuman-run-mid", hanumanRunMidUrl);
    this.load.image("hanuman-run-b", hanumanRunBUrl);
    this.load.image("hanuman-air", hanumanAirUrl);
    this.load.image("hanuman-attack-windup", hanumanAttackWindupUrl);
    this.load.image("hanuman-attack-impact", hanumanAttackImpactUrl);
  }

  create(): void {
    const seedText = new URLSearchParams(location.search).get("seed");
    const parsedSeed = seedText ? Number(seedText) : 205;
    this.state = createGame(Number.isFinite(parsedSeed) ? parsedSeed : 205);
    window.__WIND_STATE__ = this.state;
    window.__WIND_PAUSED__ = false;
    window.__WIND_MUTED__ = false;
    window.__WIND_CAPTURE__ = {
      version: 1,
      seed: this.state.seed,
      fixedDt: FIXED_DT,
      inputs: [],
      contentFingerprint: replayContentFingerprint,
      finalStateJson: JSON.stringify(this.state),
    };
    window.__WIND_EXPORT_CAPTURE__ = () =>
      JSON.stringify(window.__WIND_CAPTURE__, null, 2);
    window.__WIND_HERO_POSE__ = "idle";
    window.__WIND_HERO_POSE_HISTORY__ = ["idle"];
    window.__WIND_HERO_TEXTURE__ = "hanuman-wind";
    window.__WIND_HERO_TEXTURE_HISTORY__ = ["hanuman-wind"];
    window.__WIND_ATMOSPHERE__ = {
      reducedMotion: this.reducedMotion,
      backgroundOffsetX: 0,
      cloudOffsetX: 0,
      mistOffsetX: 0,
      cloudDrift: 0,
      windStrength: 0,
      templeLights: TEMPLE_LIGHTS.length,
      birds: this.reducedMotion ? 0 : 4,
    };

    this.backgroundImage = this.add
      .image(WIDTH / 2, HEIGHT / 2, "leap-to-lanka-night")
      .setDisplaySize(BACKDROP_WIDTH, BACKDROP_HEIGHT)
      .setDepth(-4);
    this.backdropAtmosphere = this.add.graphics().setDepth(-3);
    this.worldGraphics = this.add.graphics();
    this.foregroundAtmosphere = this.add.graphics().setDepth(3);
    this.actorGraphics = this.add.graphics();
    this.heroImage = this.add
      .image(0, 0, "hanuman-wind")
      .setOrigin(0.5, 0.94)
      .setDisplaySize(150, 100)
      .setDepth(4);
    this.fxGraphics = this.add.graphics();
    this.uiGraphics = this.add.graphics();

    this.titleText = this.add
      .text(WIDTH / 2, 17, "HANUMAN: LEAP TO LANKA", {
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
        "MOVE A/D   JUMP SPACE   DASH SHIFT   ATTACK CLICK / J   FORM E   POWER Q   MUTE M",
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
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      m: Phaser.Input.Keyboard.KeyCodes.M,
      f8: Phaser.Input.Keyboard.KeyCodes.F8,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;
      this.pointerAttackQueued = true;
      this.audio.unlock();
    });
    this.game.events.on("blur", () => this.setPaused(true));
    this.draw();
  }

  override update(_time: number, deltaMs: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.escape!)) {
      this.setPaused(!this.paused);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.m!)) {
      this.audio.unlock();
      this.audio.toggleMuted();
      window.__WIND_MUTED__ = this.audio.isMuted;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.f8!)) {
      this.downloadReplayCapture();
    }
    if (this.paused) {
      this.accumulator = 0;
      this.draw();
      return;
    }

    this.bufferedInput = bufferInput(this.bufferedInput, this.readInput());
    this.accumulator += Math.min(deltaMs, 50) / 1000;
    while (this.accumulator >= FIXED_DT) {
      const fixedInput = consumeBufferedInput(this.bufferedInput);
      window.__WIND_CAPTURE__.inputs.push({ ...fixedInput });
      this.state = step(
        this.state,
        fixedInput,
        FIXED_DT,
      );
      window.__WIND_CAPTURE__.finalStateJson = JSON.stringify(this.state);
      this.accumulator -= FIXED_DT;
    }
    window.__WIND_STATE__ = this.state;
    this.audio.sync(this.state);

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
    this.cameraX = Phaser.Math.Linear(
      this.cameraX,
      targetX,
      this.reducedMotion ? 0.2 : 0.08,
    );
    this.cameraY = Phaser.Math.Linear(
      this.cameraY,
      targetY,
      this.reducedMotion ? 0.2 : 0.07,
    );
    const backgroundOffsetX =
      -this.cameraX * (this.reducedMotion ? 0.008 : 0.025);
    this.backgroundImage.setPosition(
      WIDTH / 2 + backgroundOffsetX,
      HEIGHT / 2 - this.cameraY * (this.reducedMotion ? 0.004 : 0.012),
    );
    this.draw();
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    window.__WIND_PAUSED__ = paused;
    this.accumulator = 0;
    this.bufferedInput = createInputBuffer();
    this.pointerAttackQueued = false;
    this.audio.setPaused(paused);
    if (paused) this.input.keyboard?.resetKeys();
  }

  private downloadReplayCapture(): void {
    const blob = new Blob([window.__WIND_EXPORT_CAPTURE__()], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hanuman-capture-seed-${window.__WIND_CAPTURE__.seed}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
    input.powerPressed = Phaser.Input.Keyboard.JustDown(this.keys.q!);
    input.attackPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.j!) ||
      this.pointerAttackQueued;
    this.pointerAttackQueued = false;
    if (
      input.moveX !== 0 ||
      input.jumpPressed ||
      input.dashPressed ||
      input.formPressed ||
      input.powerPressed ||
      input.attackPressed
    ) {
      this.audio.unlock();
    }
    input.restart = Phaser.Input.Keyboard.JustDown(this.keys.r!);
    return input;
  }

  private draw(): void {
    this.drawLivingBackdrop();
    this.drawWorld();
    this.drawActor();
    this.drawEffects();
    this.drawUi();
  }

  private drawLivingBackdrop(): void {
    const back = this.backdropAtmosphere.clear();
    const front = this.foregroundAtmosphere.clear();
    const motionTick = this.reducedMotion ? 0 : this.state.tick;
    const cloudDrift = motionTick * 0.055;
    const speedShare = Phaser.Math.Clamp(
      Math.abs(this.state.player.vx) / 460,
      0,
      1,
    );
    const windStrength = this.reducedMotion
      ? 0
      : Phaser.Math.Clamp(
          0.2 +
            speedShare * 0.75 +
            (this.state.player.dashTimer > 0 ? 0.5 : 0),
          0,
          1.35,
        );
    const backgroundOffsetX =
      -this.cameraX * (this.reducedMotion ? 0.008 : 0.025);
    const cloudOffsetX =
      -this.cameraX * (this.reducedMotion ? 0.0015 : 0.012);
    const mistOffsetX =
      -this.cameraX * (this.reducedMotion ? 0.0025 : 0.045);
    const backgroundLeft =
      this.backgroundImage.x - this.backgroundImage.displayWidth * 0.5;
    const backgroundTop =
      this.backgroundImage.y - this.backgroundImage.displayHeight * 0.5;

    const moonX =
      backgroundLeft + this.backgroundImage.displayWidth * 0.34;
    const moonY =
      backgroundTop + this.backgroundImage.displayHeight * 0.205;
    const moonPulse = this.reducedMotion
      ? 1
      : 1 + Math.sin(motionTick * 0.018) * 0.06;
    back.fillStyle(0xe7fbff, 0.025);
    back.fillCircle(moonX, moonY, 76 * moonPulse);
    back.lineStyle(2, 0xdaf8ff, 0.09);
    back.strokeCircle(moonX, moonY, 55 * moonPulse);

    for (let cloud = 0; cloud < 6; cloud += 1) {
      const cloudX =
        wrap(
          cloud * 214 +
            cloudDrift * (0.35 + (cloud % 3) * 0.12) +
            cloudOffsetX,
          WIDTH + 380,
        ) - 190;
      const cloudY = 74 + ((cloud * 71) % 135);
      const cloudWidth = 118 + (cloud % 3) * 38;
      back.fillStyle(0xc8e8ed, 0.018 + (cloud % 2) * 0.012);
      back.fillEllipse(cloudX, cloudY, cloudWidth, 25);
      back.fillEllipse(
        cloudX + cloudWidth * 0.18,
        cloudY - 8,
        cloudWidth * 0.52,
        23,
      );
      back.fillEllipse(
        cloudX - cloudWidth * 0.24,
        cloudY + 4,
        cloudWidth * 0.45,
        18,
      );
    }

    for (let mist = 0; mist < 7; mist += 1) {
      const mistX =
        wrap(
          mist * 191 +
            cloudDrift * (0.75 + (mist % 2) * 0.22) +
            mistOffsetX,
          WIDTH + 480,
        ) - 240;
      const mistY = 290 + ((mist * 53) % 155);
      back.fillStyle(0xbbe8ec, 0.018 + (mist % 3) * 0.01);
      back.fillEllipse(mistX, mistY, 260 + (mist % 3) * 65, 24);
    }

    for (const light of TEMPLE_LIGHTS) {
      const x =
        backgroundLeft + this.backgroundImage.displayWidth * light.x;
      const y =
        backgroundTop + this.backgroundImage.displayHeight * light.y;
      const flicker = this.reducedMotion
        ? 0.72
        : 0.55 + Math.sin(motionTick * 0.065 + light.phase) * 0.3;
      back.fillStyle(0xffc45e, 0.045 * flicker);
      back.fillCircle(x, y, light.size * 5);
      back.fillStyle(0xffe28a, 0.55 + flicker * 0.4);
      back.fillCircle(x, y, light.size);
    }

    if (!this.reducedMotion) {
      for (let bird = 0; bird < 4; bird += 1) {
        const x =
          wrap(
            bird * 287 + motionTick * (0.12 + bird * 0.018) -
              this.cameraX * 0.025,
            WIDTH + 240,
          ) - 120;
        const y = 135 + ((bird * 47) % 105) + Math.sin(motionTick * 0.025 + bird) * 6;
        const wing = Math.sin(motionTick * 0.13 + bird) * 3;
        back.lineStyle(1.5, 0x06151d, 0.42);
        back.lineBetween(x - 5, y + wing, x, y);
        back.lineBetween(x, y, x + 5, y - wing);
      }
    }

    if (!this.reducedMotion) {
      const streakCount = 13 + Math.round(windStrength * 12);
      for (let streak = 0; streak < streakCount; streak += 1) {
        const speed = 0.7 + (streak % 5) * 0.18 + windStrength * 1.5;
        const x =
          wrap(
            streak * 173 + motionTick * speed - this.cameraX * 0.08,
            WIDTH + 300,
          ) - 150;
        const y = 92 + ((streak * 83) % 345);
        const length = 24 + (streak % 4) * 13 + windStrength * 38;
        front.lineStyle(
          1 + (streak % 2),
          0xd5fbff,
          0.055 + windStrength * 0.08,
        );
        front.lineBetween(x, y, x + length, y - 4 - windStrength * 2);
      }

      const leafCount = Math.round(windStrength * 10);
      for (let leaf = 0; leaf < leafCount; leaf += 1) {
        const x =
          wrap(
            leaf * 127 + motionTick * (1.25 + windStrength) -
              this.cameraX * 0.11,
            WIDTH + 160,
          ) - 80;
        const y =
          220 +
          ((leaf * 61 + motionTick * (0.28 + (leaf % 3) * 0.08)) % 250);
        const tilt = Math.sin(motionTick * 0.12 + leaf) * 6;
        front.fillStyle(leaf % 2 === 0 ? 0x8ab06d : 0xd59d45, 0.26);
        front.fillTriangle(
          x - 4,
          y,
          x + 5,
          y + tilt * 0.3,
          x,
          y + 5,
        );
      }
    }

    window.__WIND_ATMOSPHERE__ = {
      reducedMotion: this.reducedMotion,
      backgroundOffsetX,
      cloudOffsetX,
      mistOffsetX,
      cloudDrift,
      windStrength,
      templeLights: TEMPLE_LIGHTS.length,
      birds: this.reducedMotion ? 0 : 4,
    };
  }

  private drawWorld(): void {
    const g = this.worldGraphics.clear();
    const motionTick = this.reducedMotion ? 0 : this.state.tick;
    g.fillGradientStyle(0x071525, 0x071525, 0x143d4d, 0x1c5b62, 0.22);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    for (const platform of this.state.platforms)
      drawPlatform(g, platform, this.cameraX, this.cameraY);
    for (const seal of this.state.seals) {
      if (!seal.broken) drawSeal(g, seal, this.cameraX, this.cameraY);
    }
    for (const wave of this.state.shadowWaves) {
      drawShadowWave(g, wave, this.cameraX, this.cameraY, motionTick);
    }
    for (const sentry of this.state.shadowSentries) {
      if (!sentry.defeated) {
        drawShadowSentry(
          g,
          sentry,
          this.cameraX,
          this.cameraY,
          motionTick,
        );
      }
    }
    const usableAnchorIndex = findUsableWindAnchorIndex(this.state);
    for (
      let anchorIndex = 0;
      anchorIndex < this.state.windAnchors.length;
      anchorIndex += 1
    ) {
      const anchor = this.state.windAnchors[anchorIndex]!;
      drawWindAnchor(
        g,
        anchor,
        this.cameraX,
        this.cameraY,
        motionTick,
        anchorIndex === usableAnchorIndex,
      );
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
      const pulse = 1 + Math.sin((motionTick + index * 17) * 0.08) * 0.12;
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
      isFinishReady(this.state),
    );

    g.fillStyle(0x061321, 0.84);
    g.fillRect(0, HEIGHT - 64, WIDTH, 64);
    for (let wave = 0; wave < 16; wave += 1) {
      const x = wave * 75 - ((motionTick * 0.25) % 75);
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

    if (player.dashTimer > 0 && !this.reducedMotion) {
      for (let trail = 4; trail >= 1; trail -= 1) {
        g.fillStyle(0x8ff7ff, 0.05 + (4 - trail) * 0.035);
        g.fillEllipse(
          x - player.facing * trail * 22,
          y - 34,
          player.form === "mountain" ? 52 : 42,
          player.form === "mountain" ? 72 : 62,
        );
      }
    }
    if (player.earthSlamming) {
      g.lineStyle(5, 0xffc263, 0.55);
      for (let trail = 1; trail <= 4; trail += 1) {
        g.lineBetween(x - 18, y - 55 - trail * 15, x - 8, y - 42 - trail * 8);
        g.lineBetween(x + 18, y - 55 - trail * 15, x + 8, y - 42 - trail * 8);
      }
    }
    if (player.attackTimer > 0) {
      const progress = 1 - player.attackTimer / GADA_STRIKE_TOTAL_TIME;
      const angle =
        player.attackFacing === 1
          ? -1.35 + progress * 2.25
          : Math.PI + 1.35 - progress * 2.25;
      const handX = x + player.attackFacing * 7;
      const handY = y - 35;
      g.lineStyle(
        isGadaStrikeActive(player) ? 10 : 5,
        0xffd56a,
        isGadaStrikeActive(player) ? 0.4 : 0.18,
      );
      g.beginPath();
      g.arc(
        handX,
        handY,
        GADA_STRIKE_REACH * 0.72,
        angle - 0.55,
        angle + 0.18,
        false,
      );
      g.strokePath();
    }

    const attackProgress =
      player.attackTimer > 0
        ? 1 - player.attackTimer / GADA_STRIKE_TOTAL_TIME
        : 0;
    let heroPose = selectHeroPose(player, attackProgress);
    let textureKey = `hanuman-${heroPose === "idle" ? "wind" : heroPose}`;
    if (!this.textures.exists(textureKey)) {
      heroPose = "idle";
      textureKey = "hanuman-wind";
    }
    const motionLean = player.earthSlamming
      ? player.facing * 0.34
      : player.dashTimer > 0
        ? player.facing * 0.13
        : isRunPose(heroPose)
          ? Phaser.Math.Clamp(player.vx / 2600, -0.045, 0.045)
          : 0;
    const lift = player.earthSlamming ? 10 : player.gliding ? -8 : 0;
    const formScale = player.form === "mountain" ? 1.1 : 1;
    const poseOrigin = heroPoseOrigin(heroPose);
    const runBob =
      !this.reducedMotion && isRunPose(heroPose)
        ? Math.sin((player.x / 28) * Math.PI) * 2
        : 0;
    const attackKick =
      heroPose === "attack-impact" ? player.attackFacing * 4 : 0;
    const attackStretch = heroPose === "attack-impact" ? 1.04 : 1;
    this.heroImage
      .setTexture(textureKey)
      .setOrigin(poseOrigin.x, poseOrigin.y)
      .setPosition(x + attackKick, y + lift + runBob + 3)
      .setFlipX(
        (player.attackTimer > 0 ? player.attackFacing : player.facing) < 0,
      )
      .setRotation(motionLean)
      .setScale(
        (168 / 1536) * formScale * attackStretch,
        (112 / 1024) * formScale,
      )
      .setTint(player.form === "mountain" ? 0xffd19a : 0xffffff)
      .setAlpha(player.dashTimer > 0 ? 0.9 : 1)
      .setVisible(
        x > -180 && x < WIDTH + 180 && y > -130 && y < HEIGHT + 130,
      );
    if (this.heroImage.texture.key !== textureKey) {
      heroPose = "idle";
      this.heroImage.setTexture("hanuman-wind").setOrigin(0.46, 0.94);
    }
    recordDisplayedHeroPose(heroPose, this.heroImage.texture.key);

    if (player.form === "mountain") {
      g.lineStyle(4, 0xffb655, 0.38);
      g.strokeEllipse(x, y - 43 + lift, 76, 98);
    } else if (player.gliding) {
      g.lineStyle(3, 0xcffcff, 0.45);
      g.beginPath();
      g.arc(x, y - 36 + lift, 62, Math.PI * 1.05, Math.PI * 1.95, false);
      g.strokePath();
    }
  }

  private drawEffects(): void {
    const g = this.fxGraphics.clear();
    for (const burst of this.state.bursts) {
      const x = burst.x - this.cameraX;
      const y = burst.y - this.cameraY;
      const alpha = Phaser.Math.Clamp(burst.ttl * 4, 0, 1);
      if (burst.kind === "shockwave") {
        const spread =
          (1 - Phaser.Math.Clamp(burst.ttl / 0.65, 0, 1)) *
          EARTH_SLAM_SHOCKWAVE_RADIUS;
        g.lineStyle(7, 0xffc15e, alpha);
        g.beginPath();
        g.arc(x, y + 2, spread, Math.PI, Math.PI * 2, false);
        g.strokePath();
        g.lineStyle(3, 0xffefaa, alpha * 0.8);
        g.lineBetween(x - spread, y + 2, x + spread, y + 2);
        continue;
      }
      const count = burst.kind === "sigil" || burst.kind === "break" ? 12 : 7;
      const color =
        burst.kind === "hit"
          ? 0xff5a70
          : burst.kind === "pulse"
            ? 0xd07aff
            : burst.kind === "dispel"
              ? 0x8ff7ff
              : burst.kind === "strike"
                ? 0xffd56a
          : burst.kind === "defeat"
            ? 0xc67cff
            : burst.kind === "fall"
              ? 0xffb45b
              : burst.kind === "break"
                ? 0xffc15e
                : burst.kind === "transform"
                  ? 0xffe38b
                  : burst.kind === "anchor"
                    ? 0x92fbff
                    : burst.kind === "slam"
                      ? 0xffc15e
                      : 0xc5fbff;
      g.lineStyle(burst.kind === "dash" ? 4 : 3, color, alpha);
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count;
        const distance =
          (1 - alpha) *
          (burst.kind === "sigil" ? 75 : 42) *
          (this.reducedMotion ? 0.4 : 1);
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        g.lineBetween(
          x + dx,
          y + dy,
          x + dx + Math.cos(angle) * 15,
          y + dy + Math.sin(angle) * 15,
        );
      }
    }
  }

  private drawUi(): void {
    const g = this.uiGraphics.clear();
    const collected = this.state.sigils.filter(
      (sigil) => sigil.collected,
    ).length;
    const sentriesDefeated = this.state.shadowSentries.filter(
      (sentry) => sentry.defeated,
    ).length;
    const shadowHits =
      this.state.player.sentryHitCount +
      this.state.player.shadowWaveHitCount;
    const pulsesFired = this.state.shadowSentries.reduce(
      (total, sentry) => total + sentry.pulseCount,
      0,
    );

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
    g.fillRoundedRect(
      WIDTH - 178,
      96,
      this.state.player.dashAvailable ? 143 : 0,
      9,
      4,
    );

    this.statsText.setText(
      `WIND SIGILS  ${collected} / ${this.state.sigils.length}   SENTRIES ${sentriesDefeated} / ${this.state.shadowSentries.length}\nTIME  ${formatTime(this.state.elapsed)}   FALLS  ${this.state.falls}   HITS ${shadowHits}   SOUND ${this.audio.isMuted ? "OFF" : "ON"}\nFORM  ${this.state.player.form.toUpperCase()}   VAULTS ${this.state.player.anchorUseCount}   SLAMS ${this.state.player.earthSlamImpactCount}   PULSES ${pulsesFired}`,
    );

    const nearCrackedStone = this.state.seals.some((seal) => {
      if (seal.broken) return false;
      const closestX = Phaser.Math.Clamp(
        this.state.player.x,
        seal.x,
        seal.x + seal.width,
      );
      return Math.abs(this.state.player.x - closestX) <= 220;
    });
    const centerMessage =
      this.paused
        ? "PAUSED\nPRESS ESC TO RETURN"
        : this.state.status === "won"
        ? `THE PATH TO LANKA OPENS\n${formatTime(this.state.elapsed)}  •  ${this.state.falls} FALLS  •  ${shadowHits} HITS\nPRESS R TO RUN AGAIN`
        : !this.state.started
          ? "THE WIND CARRIES A CALL ACROSS THE SEA\nCOLLECT 7 SIGILS. DEFEAT 2 SENTRIES. REACH THE SHRINE.\nPRESS A / D TO BEGIN"
          : collected === this.state.sigils.length &&
              !this.state.shadowSentries.every((sentry) => sentry.defeated)
            ? "THE SHRINE IS SHADOW-BOUND. DEFEAT BOTH SENTRIES."
            : isFinishReady(this.state)
              ? "THE PATH IS CLEAR. REACH THE GOLDEN SHRINE."
            : this.state.shadowWaves.some(
                  (wave) =>
                    Math.abs(wave.x - this.state.player.x) <= 260,
                )
              ? "SHADOW WAVE\nJUMP OR VAULT. MOUNTAIN SLAM DISPELS."
              : this.state.shadowSentries.some(
                  (sentry) =>
                    !sentry.defeated &&
                    Math.abs(sentry.x - this.state.player.x) <= 220,
                )
              ? "SHADOW SENTRY\nGADA: J / CLICK. MOUNTAIN: DASH OR SLAM."
              : nearCrackedStone
                ? "CRACKED STONE\nMOUNTAIN: DASH OR JUMP, THEN Q"
                : "";
    this.centerText.setText(centerMessage);
    this.centerText.setVisible(centerMessage.length > 0);

    if (this.state.status === "won") {
      g.fillStyle(0x03101a, 0.7);
      g.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }
}

function selectHeroPose(
  player: GameState["player"],
  attackProgress: number,
): HeroPose {
  if (player.attackTimer > 0) {
    const windupShare =
      movementContent.gadaStrike.windupTime / GADA_STRIKE_TOTAL_TIME;
    return attackProgress < windupShare
      ? "attack-windup"
      : "attack-impact";
  }
  if (
    player.earthSlamming ||
    player.dashTimer > 0 ||
    !player.onGround
  ) {
    return "air";
  }
  if (Math.abs(player.vx) > 35) {
    const runPoses: HeroPose[] = ["run-a", "run-mid", "run-b"];
    return runPoses[
      Math.floor(Math.abs(player.x) / 28) % runPoses.length
    ]!;
  }
  return "idle";
}

function isRunPose(pose: HeroPose): boolean {
  return pose === "run-a" || pose === "run-mid" || pose === "run-b";
}

function heroPoseOrigin(pose: HeroPose): { x: number; y: number } {
  switch (pose) {
    case "idle":
      return { x: 0.46, y: 0.94 };
    case "run-a":
    case "run-b":
      return { x: 0.5, y: 0.9 };
    case "run-mid":
      return { x: 0.5, y: 0.92 };
    case "air":
      return { x: 0.5, y: 0.88 };
    case "attack-windup":
      return { x: 0.5, y: 0.93 };
    case "attack-impact":
      return { x: 0.43, y: 0.91 };
  }
}

function recordDisplayedHeroPose(pose: HeroPose, textureKey: string): void {
  if (window.__WIND_HERO_POSE__ !== pose) {
    window.__WIND_HERO_POSE__ = pose;
    window.__WIND_HERO_POSE_HISTORY__.push(pose);
    if (window.__WIND_HERO_POSE_HISTORY__.length > 24) {
      window.__WIND_HERO_POSE_HISTORY__.shift();
    }
  }
  if (window.__WIND_HERO_TEXTURE__ !== textureKey) {
    window.__WIND_HERO_TEXTURE__ = textureKey;
    window.__WIND_HERO_TEXTURE_HISTORY__.push(textureKey);
    if (window.__WIND_HERO_TEXTURE_HISTORY__.length > 24) {
      window.__WIND_HERO_TEXTURE_HISTORY__.shift();
    }
  }
}

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function drawShadowSentry(
  g: Phaser.GameObjects.Graphics,
  sentry: ShadowSentry,
  cameraX: number,
  cameraY: number,
  tick: number,
): void {
  const x = sentry.x - cameraX;
  const y = sentry.y - cameraY;
  if (x < -80 || x > WIDTH + 80) return;
  const halfWidth = SHADOW_SENTRY_WIDTH * 0.5;
  const headRadius = SHADOW_SENTRY_HEIGHT * 0.29;
  const headY = y - SHADOW_SENTRY_HEIGHT * 0.74;
  const pulse = 1 + Math.sin(tick * 0.12 + sentry.x) * 0.08;
  const telegraphProgress =
    sentry.telegraphTimer > 0
      ? 1 - sentry.telegraphTimer / SHADOW_SENTRY_TELEGRAPH_TIME
      : 0;
  if (sentry.telegraphTimer > 0) {
    g.lineStyle(5, 0xf09bff, 0.45 + telegraphProgress * 0.5);
    g.strokeCircle(
      x,
      y - SHADOW_SENTRY_HEIGHT * 0.52,
      SHADOW_SENTRY_HEIGHT * (0.7 + telegraphProgress * 0.45),
    );
    g.lineStyle(2, 0xffd1ff, 0.7);
    g.strokeCircle(
      x,
      y - SHADOW_SENTRY_HEIGHT * 0.52,
      SHADOW_SENTRY_HEIGHT * (0.35 + telegraphProgress * 0.25),
    );
  }
  g.fillStyle(0x702a99, 0.14);
  g.fillCircle(
    x,
    y - SHADOW_SENTRY_HEIGHT * 0.52,
    SHADOW_SENTRY_HEIGHT * 0.55 * pulse,
  );
  g.fillStyle(0x170d26, 0.96);
  g.fillTriangle(
    x - halfWidth,
    y,
    x,
    y - SHADOW_SENTRY_HEIGHT,
    x + halfWidth,
    y,
  );
  g.fillCircle(x, headY, headRadius);
  g.lineStyle(3, 0xb45ee8, 0.9);
  g.strokeCircle(x, headY, headRadius * pulse);
  g.fillStyle(0xff547f, 1);
  g.fillCircle(x - halfWidth / 3, headY - 2, 3);
  g.fillCircle(x + halfWidth / 3, headY - 2, 3);
}

function drawShadowWave(
  g: Phaser.GameObjects.Graphics,
  wave: ShadowWave,
  cameraX: number,
  cameraY: number,
  tick: number,
): void {
  const x = wave.x - cameraX;
  const y = wave.y - cameraY;
  if (x < -80 || x > WIDTH + 80) return;
  const direction = wave.vx < 0 ? -1 : 1;
  const flutter = Math.sin(tick * 0.25 + wave.id) * 3;
  g.fillStyle(0x7a2ca3, 0.2);
  g.fillEllipse(x, y - SHADOW_WAVE_HEIGHT * 0.45, SHADOW_WAVE_WIDTH * 1.6, SHADOW_WAVE_HEIGHT * 1.3);
  g.fillStyle(0x241034, 0.96);
  g.fillTriangle(
    x - SHADOW_WAVE_WIDTH * 0.5,
    y,
    x + direction * SHADOW_WAVE_WIDTH * 0.5,
    y - SHADOW_WAVE_HEIGHT + flutter,
    x + SHADOW_WAVE_WIDTH * 0.5,
    y,
  );
  g.lineStyle(3, 0xd57cff, 0.9);
  g.beginPath();
  g.arc(
    x,
    y,
    SHADOW_WAVE_WIDTH * 0.48,
    Math.PI,
    Math.PI * 2,
    false,
  );
  g.strokePath();
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

function drawWindAnchor(
  g: Phaser.GameObjects.Graphics,
  anchor: WindAnchor,
  cameraX: number,
  cameraY: number,
  tick: number,
  active: boolean,
): void {
  const x = anchor.x - cameraX;
  const y = anchor.y - cameraY;
  if (x < -70 || x > WIDTH + 70 || y < -70 || y > HEIGHT + 70) return;
  const pulse = 1 + Math.sin(tick * 0.1 + anchor.x * 0.01) * 0.1;
  g.fillStyle(active ? 0x9ffcff : 0x69cad7, active ? 0.2 : 0.1);
  g.fillCircle(x, y, (active ? 34 : 27) * pulse);
  g.lineStyle(active ? 5 : 3, active ? 0xd8ffff : 0x7de4ee, active ? 1 : 0.75);
  g.strokeCircle(x, y, 15 * pulse);
  g.beginPath();
  g.arc(x, y, 8 * pulse, -0.7, Math.PI * 1.25, false);
  g.strokePath();
  g.lineBetween(x + 5, y + 7, x + 13, y + 14);
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
    g.lineBetween(
      x + offset,
      y + 16,
      x + offset + 17,
      y + Math.min(48, platform.height - 3),
    );
  }
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
