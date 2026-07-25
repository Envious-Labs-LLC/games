# Games

One folder per game. Start a new one with the `/new-game-project` skill (copies `../templates/game-ts/` here, installs deps, confirms it boots).

Each game is self-contained: its own `package.json`, `src/sim/` (pure logic) and `src/view/` (Phaser), `content/`, `assets/`, `tests/`, and `tools/bots/`. The studio harness (`../.claude/`) governs all of them.

## Current games

- `flame-of-lanka-prototype`: a short side-scrolling combat prototype. Crawl
  stage, ready for founder playtesting.
