// The simulation: pure game logic and state. No Phaser, no DOM, no window.
// Runs headless in Node. This is the Heart. See ADR-0002 and ADR-0004.
//
// This template ships the smallest real loop: a box you move on a field,
// deterministic from a seed. Replace it with your game's rules.

import { makeRng, type Rng } from "./rng";

export const FIXED_DT = 1 / 60; // seconds per sim step (fixed timestep)
const SPEED = 200; // units per second

export interface Input {
  move: { x: number; y: number }; // each component in [-1, 1]
}

export interface GameState {
  tick: number;
  rng: Rng; // gameplay randomness; serializes with the state
  width: number;
  height: number;
  player: { x: number; y: number };
}

export function createGame(seed: number): GameState {
  return {
    tick: 0,
    rng: makeRng(seed),
    width: 960,
    height: 540,
    player: { x: 480, y: 270 },
  };
}

// One deterministic step. Mutates and returns the same state for simplicity.
// No Math.random(), no Date.now(): time enters only via dt.
export function step(state: GameState, input: Input, dt: number): GameState {
  state.tick += 1;
  state.player.x = clamp(state.player.x + input.move.x * SPEED * dt, 0, state.width);
  state.player.y = clamp(state.player.y + input.move.y * SPEED * dt, 0, state.height);
  return state;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
