# Hanuman: Leap to Lanka

A finished short browser-game vertical slice about Hanuman crossing a moonlit
coast on the path to Lanka.

## Goal

Collect seven wind sigils, defeat two shadow sentries, and reach the golden
shrine. Agile Wind Form glides, wall-jumps, air-dashes, and launches from wind
anchors. Heavy Mountain Form smashes cracked stone, survives shadow waves while
dashing, and creates a wave-dispelling earth-slam. Hanuman's gada strike works
on the ground or in the air. Enemy contact or a shadow wave returns Hanuman to
the latest checkpoint.

## Controls

- Move: A/D (left/right arrows also work)
- Jump: Space
- Higher leap: hold Space while rising
- Glide: hold Space while falling
- Ground or air dash: Shift
- Gada strike: left click or J
- Change form: E
- Form power: Q
  - Wind Form near a glowing anchor: wind vault
  - Mountain Form while airborne: earth-slam
- Wall jump: press Space while touching a wall
- Pause: Escape
- Mute: M
- Restart: R

## Run

```bash
pnpm install
pnpm dev
```

## Proof

```bash
pnpm lint
pnpm typecheck
pnpm validate:content
pnpm test
pnpm test:e2e
pnpm soak
pnpm playtest --runs 500
pnpm build
```

Press F8 during a browser run to download its deterministic input capture. Turn
that capture into a checked replay with:

```bash
pnpm replay --record hanuman-capture-seed-205.json replay.json
pnpm replay replay.json
```
