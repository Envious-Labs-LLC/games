# Hanuman Wind Lab

A short browser experiment testing whether wind-powered movement feels like a
strong foundation for a Hanuman-inspired game.

## Goal

Collect seven wind sigils and reach the golden shrine. The course tests variable
jump height, gliding, air dashing, wall sliding, wall jumping, gaps, recovery,
and vertical traversal.

## Controls

- Move: A/D (left/right arrows also work)
- Jump: Space
- Higher leap: hold Space while rising
- Glide: hold Space while falling
- Air dash: Shift
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
