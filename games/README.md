# Games

**Every game is its own GitHub repo.** This folder holds local checkouts of those
repos, and the studio repo gitignores each one. No game code is committed here.

Start a new game with the `/new-game-project` skill (copies `../templates/game-ts/`
here, installs deps, confirms it boots), then create a GitHub repo for it and push.

A TypeScript game is self-contained: its own `package.json`, `src/sim/` (pure logic)
and `src/view/` (Phaser), `content/`, `assets/`, `tests/`, and `tools/bots/`. Unity
games use their own layout. The studio harness (`../.claude/`) governs all of them.

## Current games

- **Project Trishul** — the Hanuman action game.
  [saurabhav88/project-trishul](https://github.com/saurabhav88/project-trishul).
  Unity 6, with the browser Animation Studio as its production gate. Its
  `prototypes/` folder holds the two earlier browser builds of this same game,
  `hanuman-wind-lab` (traversal and vertical slice) and `flame-of-lanka` (combat),
  moved in on 2026-07-26 with their full history. They are feel references, not
  separate products.
- **Moonwheat** — night farming prototype on Unity's Happy Harvest sample.
  [Envious-Labs-LLC/moonwheat](https://github.com/Envious-Labs-LLC/moonwheat).
  Only original code and a hooks patch are tracked; the Unity sample stays
  gitignored so none of it is redistributed.
