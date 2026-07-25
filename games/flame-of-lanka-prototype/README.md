# Flame of Lanka Prototype

A short browser-based side-scrolling combat prototype built to test movement,
attack timing, enemy pressure, and the fun of the core loop.

## Play

```bash
pnpm install
pnpm dev
```

Open the local address shown in the terminal.

## Controls

- Move: A/D or left/right arrows
- Jump: W, up arrow, or Space
- Light attack: J
- Heavy attack: K
- Restart after victory or defeat: R

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
