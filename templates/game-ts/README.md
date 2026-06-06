# game-ts template

The starter for a new game. The `/new-game-project` skill copies this into `games/<name>/`, runs `pnpm install`, and confirms it boots.

It ships the smallest real loop: a box you move with the arrow keys, deterministic from a `?seed=` URL parameter. Replace the sim and view with your game.

## Layout

```
src/
  sim/      pure game logic + state (rng.ts, index.ts). No Phaser, no DOM. Runs in Node.
  view/     Phaser scenes that draw the sim and feed input back (main.ts).
  content/  Zod schemas + a registry for game data (add as you grow).
  platform/ thin adapters: storage, audio, input mapping (add as you grow).
  debug/    overlay, logging, replay tooling (add as you grow).
content/    design data (YAML), one file per type, validated by content/schemas.
assets/     source/ (committed via LFS) and generated/ (build output, gitignored).
tests/      unit/ (functions), sim/ (headless whole-game), e2e/ (Playwright boot).
tools/      bots/ (playtest), validate-content.ts, replay.ts.
```

## Command contract

```bash
pnpm dev              # run locally with hot reload (http://localhost:5173)
pnpm test             # unit + sim tests (Vitest, headless)
pnpm test:sim         # sim tests only
pnpm test:e2e         # boot the game in a headless browser (Playwright)
pnpm typecheck        # TypeScript strict check
pnpm lint             # ESLint
pnpm validate:content # Zod-validate content (no-op until content exists)
pnpm playtest --runs 500   # run the bot N times; prints JSON, exits non-zero on crash
pnpm replay <file>    # re-run a recorded game (implement with the replay format)
pnpm build            # production web build → dist/
```

## Bootstrap (first time, done by /new-game-project)

```bash
pnpm install
pnpm exec playwright install --with-deps chromium   # once, for test:e2e
pnpm dev   # then open the URL and move the box
```

## Rules to keep

- `src/sim/` never imports `phaser`, `src/view/`, `window`, or `document`.
- No `Math.random()` / `Date.now()` in the sim. Use the seeded RNG; time enters via `dt`.
- Tunable values go in `content/`, not code. Every asset gets a manifest + license entry.
- Every feature ships with a test or a bot scenario.
