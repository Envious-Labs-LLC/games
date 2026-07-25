# Games Studio

A studio for building video games as a two-person team: Saurabh (founder, creative director) and Claude (the engineering team). Built so an AI agent can build games end to end from the command line: write code, run the game, playtest it thousands of times, and ship it, with no GUI editor in the loop.

## The idea

A game is split into a **simulation** (pure-logic rules and state, runs headless in Node) and a **view** (Phaser graphics/sound that draws the simulation). Keeping them apart lets the agent playtest the game thousands of times per second to find bugs and tune balance, and keeps the engine choice reversible. See `.claude/adrs/0002-sim-view-separation.md`.

## Stack

TypeScript, Phaser 3 (2D), Vite, pnpm, Vitest + Playwright, Zod. Electron for desktop/Steam (Run stage). Godot 4 is the documented fallback for a 3D-forward game. Rationale: `.claude/adrs/0001-engine-and-stack.md`.

## Crawl → Walk → Run

- **Crawl:** learn the machine. One playable gray-box loop. Runs locally.
- **Walk:** real small game. GitHub + CI, art/audio pipeline, bot playtests, vertical slice.
- **Run:** ship and sustain. Steam/itch, telemetry, crashes, patches.

## Layout

```
games/              the games, one folder each
templates/game-ts/  the starter copied to begin a new game
docs/               design notes, plans, session log
.claude/            the harness: rules, knowledge, skills, agents, adrs, scripts
.github/workflows/  CI (activates when a remote is added)
```

## Start here

- Orientation: `.claude/knowledge/crawl/00-start-here.md`
- The operating manual: `CLAUDE.md`
- Begin a game: the `/new-game-project` skill.

## Status

Crawl. The first playable, `games/flame-of-lanka-prototype`, is ready for
founder playtesting in a browser.
