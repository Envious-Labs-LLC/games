// The view: Phaser draws the sim and feeds input back. It reads sim state and
// never writes it outside step(). See .claude/knowledge/walk/phaser-patterns.md.

import Phaser from "phaser";
import { createGame, step, FIXED_DT, type GameState, type Input } from "../sim/index";

class GameScene extends Phaser.Scene {
  private state!: GameState;
  private rect!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private acc = 0;

  constructor() {
    super("game");
  }

  create(): void {
    const seedParam = new URLSearchParams(location.search).get("seed");
    const seed = seedParam ? Number(seedParam) : 12345;
    this.state = createGame(seed);
    this.rect = this.add.rectangle(this.state.player.x, this.state.player.y, 32, 32, 0x66ccff);
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  override update(_time: number, deltaMs: number): void {
    const input: Input = {
      move: {
        x: (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0),
        y: (this.cursors.down.isDown ? 1 : 0) - (this.cursors.up.isDown ? 1 : 0),
      },
    };
    // Fixed timestep: draw at any frame rate, advance the sim in equal steps.
    this.acc += deltaMs / 1000;
    while (this.acc >= FIXED_DT) {
      this.state = step(this.state, input, FIXED_DT);
      this.acc -= FIXED_DT;
    }
    this.rect.setPosition(this.state.player.x, this.state.player.y);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 540,
  backgroundColor: "#1a1a1a",
  scene: [GameScene],
});
