// Seeded, deterministic RNG (mulberry32). State is serializable so it saves
// and replays exactly. Never use Math.random() in the sim; use this.

export interface Rng {
  state: number;
}

export function makeRng(seed: number): Rng {
  return { state: seed >>> 0 };
}

// Returns a float in [0, 1) and advances the RNG state in place.
export function nextFloat(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) | 0;
  let t = Math.imul(rng.state ^ (rng.state >>> 15), 1 | rng.state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Integer in [min, max] inclusive.
export function nextInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(nextFloat(rng) * (max - min + 1));
}
