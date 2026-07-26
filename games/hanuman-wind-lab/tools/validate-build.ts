import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const buildRoot = resolve("dist");
const buildBudgetBytes = 12 * 1024 * 1024;

if (!existsSync(buildRoot)) {
  throw new Error("build validation failed: dist is missing");
}

function directoryBytes(directory: string): number {
  return readdirSync(directory).reduce((total, entry) => {
    const path = resolve(directory, entry);
    const stats = statSync(path);
    return total + (stats.isDirectory() ? directoryBytes(path) : stats.size);
  }, 0);
}

const buildBytes = directoryBytes(buildRoot);
if (buildBytes > buildBudgetBytes) {
  throw new Error(
    `build validation failed: ${(buildBytes / 1024 / 1024).toFixed(2)} MiB exceeds the 12 MiB production payload budget`,
  );
}

console.log(
  `validate:build — ${(buildBytes / 1024 / 1024).toFixed(2)} MiB production payload is within the 12 MiB budget.`,
);
