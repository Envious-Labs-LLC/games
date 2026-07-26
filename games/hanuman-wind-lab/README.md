# Hanuman: Leap to Lanka

A finished short browser-game vertical slice about Hanuman crossing a moonlit
coast on the path to Lanka.

## Resume here

This folder is the complete game project. A future session can start here
without rebuilding the prototype or searching another folder.

- Current state: playable founder-review checkpoint
- Engine: Phaser 3 with TypeScript
- Gameplay rules and physics: `content/design/`
- Game code: `src/`
- Original art sources: `assets/source/`
- Asset provenance and approval status: `assets/ASSET_MANIFEST.yaml`
- Automated checks and recorded replay: `tests/`
- Bot playtesting and stability tools: `tools/`

The current movement set includes variable jump, glide, wall jump, ground and
air dash, Wind vaults, Mountain earth-slam, and form shifting. Combat includes
a ground or airborne gada strike, two shadow sentries, hit recovery, and
environment interactions. Hanuman has distinct idle, three-frame run, airborne,
attack windup, and attack impact art.

The moonlit Lanka painting is presented as a living backdrop. Distant scenery
shifts with camera depth, clouds and valley mist drift independently, temple
lights flicker, birds cross the sky, and foreground wind and leaves accelerate
with Hanuman. Reduced-motion mode keeps the atmosphere calm.

All generated art, its editable chroma source, and the prompts used to create it
are stored in this project. The art is approved for prototype use only. It is
not yet approved for commercial release.

Generated folders such as `dist/` and installed dependencies such as
`node_modules/` do not need to be preserved. They can be recreated from the
tracked source and lockfile.

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
