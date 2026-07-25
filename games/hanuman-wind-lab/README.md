# Hanuman Wind Lab

A short browser experiment testing whether wind-powered movement feels like a
strong foundation for a Hanuman-inspired game.

## Goal

Collect seven wind sigils and reach the golden shrine. Switch between agile Wind
Form and heavy Mountain Form. Wind Form glides through long crossings. Mountain
Form can dash through cracked stone seals. Wind Form can also launch from
glowing wind anchors to chain large aerial leaps. Mountain Form can answer with
a committed earth-slam and landing shockwave.

## Controls

- Move: A/D (left/right arrows also work)
- Jump: Space
- Higher leap: hold Space while rising
- Glide: hold Space while falling
- Ground or air dash: Shift
- Change form: E
- Form power: Q
  - Wind Form near a glowing anchor: wind vault
  - Mountain Form while airborne: earth-slam
- Wall jump: press Space while touching a wall
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
pnpm playtest --runs 500
pnpm build
```
