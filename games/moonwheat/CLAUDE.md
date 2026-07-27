# Moonwheat

Stage: **Crawl**. Engine: **Unity 6000.5.5f1**, URP 2D. Supersedes the studio's
TypeScript default for this game only (studio CLAUDE.md permits engine-native paths).

## The game

Night farming, built on one inversion:

- **Crops only grow in darkness.**
- **You can only see and act inside your own lantern's circle.**

So you can never watch your own farm work. Plant, walk away, come back before dawn.
You cannot tell what is ripe without lighting it, and lighting it stops it growing,
so you farm by memory of what you put where.

The lantern toggles. Lit means you can act, but you burn fuel and freeze everything
near you. Dark means the whole field grows and your fuel is safe, but you are blind.
Dawn ends the night and scores you against a quota that climbs each night.

Controls: **WASD** move, **Q** lantern, **E** plant/harvest, **R** next night.

## Where the art came from, and the licence caveat

The entire art set, character rig, animation clips, tilemaps, and 2D lighting setup
are Unity's own **Happy Harvest** 2D sample project. Nothing here was generated.

**Source used:** `github.com/lvshiling/Happy-Harvest` (community mirror, cloned
2026-07-26). That mirror is **labelled CC0 by its uploader, which is the uploader's
claim and not Unity's licence.** Unity's own sample assets ship under the Unity
Companion Licence, which permits use in Unity projects but is not CC0.

**Before this ships anywhere, re-pull the official package** from the Asset Store
(`Happy Harvest - 2D Sample Project`, publisher Unity Technologies) and diff it against
this tree, so the provenance is Unity's licence rather than a stranger's label.
For a local prototype the mirror is fine. For distribution it is not.

## Unity 6 upgrade notes

The sample targets 2022.3.6f1. Getting it onto 6000.5.5f1 needed exactly three things:

1. **Package versions realigned** to what the 6000.5.5f1 editor ships, read out of
   `Unity.app/Contents/Resources/PackageManager/Editor/manifest.json` rather than guessed.
   Input System 1.6.3 was the blocker: its editor code hits APIs that are now errors.
2. **TextMeshPro removed**, it folded into `com.unity.ugui` 2.5.0.
3. **`LightFlicker.cs`**: `GetInstanceID()` is deprecated, and its replacement
   `GetEntityId()` returns an `EntityId` that no longer casts to `int` implicitly.

**Cinemachine did not break.** Unity 6000.5.5 still ships the 2.x line (2.10.7), so the
feared 2 to 3 namespace break never applied.

## How Moonwheat attaches to the sample

Deliberately minimal, so the sample stays re-importable and the diff stays readable:

- `MoonwheatDirector` installs itself at runtime via `RuntimeInitializeOnLoadMethod`
  plus `sceneLoaded`. **It does not edit any sample scene.**
- `TerrainManager` gained two hooks and nothing else:
  - `GrowthRateModifier` — a per-cell growth multiplier. Null keeps the original
    water-driven behaviour exactly, so the sample still works untouched.
  - `OnHarvested` — an event so a game mode can score.
- Night darkness is forced in `LateUpdate`, because the sample's day cycle writes its
  own light values every frame and would otherwise stomp the override.

## Build

```bash
/Applications/Unity/Hub/Editor/6000.5.5f1/Unity.app/Contents/MacOS/Unity \
  -batchmode -projectPath . -quit \
  -executeMethod Moonwheat.EditorTools.MoonwheatBuild.BuildMac \
  -logFile build.log
```

`MoonwheatBuild.OpenFarm` sets build scenes and leaves the farm open for Editor play.
Loader boots scene index 3, so **Farm_Outdoor must stay at index 3**.

## Not done yet

- No automated check on the growth-gate rule. Studio rule
  (`testing-and-playtesting.md`) says a feature is not done without one. This is the
  gap to close first if the idea survives a playtest.
- Planting bypasses the sample's inventory and seed items on purpose, to keep the
  prototype loop tight. The tool-swing and watering animations therefore go unused.
- Quota, fuel, and night length are constants in `MoonwheatDirector`, not content
  files. Fine for Crawl, wrong by `content-and-assets.md` if this reaches Walk.
