import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import movement from "../content/design/movement.json";
import course from "../content/design/course.json";
import { courseSchema, movementSchema } from "../src/content/schemas";

movementSchema.parse(movement);
courseSchema.parse(course);

function assertContent(condition: boolean, message: string): void {
  if (!condition) throw new Error(`content validation failed: ${message}`);
}

for (const [kind, points] of [
  ["sigil", course.sigils],
  ["wind anchor", course.windAnchors],
  ["shadow sentry", course.shadowSentries],
] as const) {
  for (const point of points) {
    assertContent(
      point.x <= movement.worldWidth && point.y <= movement.worldHeight,
      `${kind} at (${point.x}, ${point.y}) is outside the world`,
    );
  }
}

for (const platform of [...course.platforms, ...course.seals]) {
  assertContent(
    platform.x + platform.width <= movement.worldWidth &&
      platform.y + platform.height <= movement.worldHeight,
    `solid at (${platform.x}, ${platform.y}) extends outside the world`,
  );
}

for (const sentry of course.shadowSentries) {
  const supported = course.platforms.some(
    (platform) =>
      platform.y === sentry.y &&
      sentry.x >= platform.x &&
      sentry.x <= platform.x + platform.width,
  );
  assertContent(
    supported,
    `shadow sentry at (${sentry.x}, ${sentry.y}) has no ground support`,
  );
}

assertContent(course.sigils.length === 7, "vertical slice must have 7 sigils");
assertContent(course.windAnchors.length === 6, "vertical slice must have 6 anchors");
assertContent(course.seals.length === 2, "vertical slice must have 2 seals");
assertContent(
  course.shadowSentries.length === 2,
  "vertical slice must have 2 shadow sentries",
);
assertContent(
  course.finish.x <= movement.worldWidth &&
    course.finish.y <= movement.worldHeight,
  "finish shrine is outside the world",
);
assertContent(
  movement.gadaStrike.reach < movement.shadowSentry.activationRange,
  "gada reach must remain shorter than sentry activation range",
);

const assetRoot = resolve("assets");
const assetManifestPath = resolve(assetRoot, "ASSET_MANIFEST.yaml");
assertContent(existsSync(assetManifestPath), "asset manifest is missing");
const assetManifest = readFileSync(assetManifestPath, "utf8");
const requiredAssetFiles = [
  "source/backgrounds/leap-to-lanka-night.png",
  "source/characters/hanuman-wind-chroma.png",
  "source/characters/hanuman-wind.png",
  "source/characters/hanuman-run-a-chroma.png",
  "source/characters/hanuman-run-a.png",
  "source/characters/hanuman-run-mid-chroma.png",
  "source/characters/hanuman-run-mid.png",
  "source/characters/hanuman-run-b-chroma.png",
  "source/characters/hanuman-run-b.png",
  "source/characters/hanuman-air-chroma.png",
  "source/characters/hanuman-air.png",
  "source/characters/hanuman-attack-windup-chroma.png",
  "source/characters/hanuman-attack-windup.png",
  "source/characters/hanuman-attack-impact-chroma.png",
  "source/characters/hanuman-attack-impact.png",
  "source/environment/high-clouds-source.png",
  "source/environment/high-clouds.png",
  "source/environment/valley-mist-source.png",
  "source/environment/valley-mist.png",
  "source/environment/wind-wisp-source.png",
  "source/environment/wind-wisp.png",
  "source/environment/lanka-stone-wall-source.png",
  "source/environment/lanka-stone-wall.png",
  "source/environment/lanka-platform-cap-chroma.png",
  "source/environment/lanka-platform-cap.png",
  "source/environment/cracked-barrier-chroma.png",
  "source/environment/cracked-barrier.png",
  "source/environment/wind-anchor-chroma.png",
  "source/environment/wind-anchor.png",
  "source/environment/lanka-shrine-chroma.png",
  "source/environment/lanka-shrine.png",
  "source/prompts/leap-to-lanka-night.md",
  "source/prompts/hanuman-wind.md",
  "source/prompts/hanuman-animation-poses.md",
  "source/prompts/environment-art-pass.md",
];
let assetBytes = 0;
for (const relativePath of requiredAssetFiles) {
  const filePath = resolve(assetRoot, relativePath);
  assertContent(existsSync(filePath), `required asset is missing: ${relativePath}`);
  assetBytes += statSync(filePath).size;
}
for (const assetId of [
  "leap-to-lanka-night",
  "hanuman-wind",
  "hanuman-animation-poses",
  "lanka-environment-art-pass",
]) {
  assertContent(
    assetManifest.includes(`id: ${assetId}`),
    `asset manifest is missing ${assetId}`,
  );
}
assertContent(
  !assetManifest.includes("prototypeUseApproved: false"),
  "all active prototype assets must be approved for prototype use",
);
assertContent(
  assetBytes <= 40 * 1024 * 1024,
  "prototype source assets exceed the 40 MB budget",
);
const runtimeAssetFiles = [
  "source/backgrounds/leap-to-lanka-night.png",
  "source/characters/hanuman-wind.png",
  "source/characters/hanuman-run-a.png",
  "source/characters/hanuman-run-mid.png",
  "source/characters/hanuman-run-b.png",
  "source/characters/hanuman-air.png",
  "source/characters/hanuman-attack-windup.png",
  "source/characters/hanuman-attack-impact.png",
  "source/environment/high-clouds.png",
  "source/environment/valley-mist.png",
  "source/environment/wind-wisp.png",
  "source/environment/lanka-stone-wall.png",
  "source/environment/lanka-platform-cap.png",
  "source/environment/cracked-barrier.png",
  "source/environment/wind-anchor.png",
  "source/environment/lanka-shrine.png",
];
const runtimeAssetBytes = runtimeAssetFiles.reduce(
  (total, relativePath) => total + statSync(resolve(assetRoot, relativePath)).size,
  0,
);
assertContent(
  runtimeAssetBytes <= 10 * 1024 * 1024,
  "runtime image assets exceed the 10 MB budget",
);

console.log(
  "validate:content — schemas, geometry, encounters, and source assets are valid.",
);
