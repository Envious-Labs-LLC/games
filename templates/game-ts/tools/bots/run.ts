// Batch playtest runner. Runs the bot N times and prints machine-readable JSON
// for the qa-playtest / balance-analyst agents to act on.
// Usage: pnpm playtest --runs 500

import { runOne } from "./randomBot";

function flagNumber(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return Number(process.argv[i + 1]);
  return fallback;
}

const runs = flagNumber("--runs", 100);
let crashes = 0;
for (let i = 0; i < runs; i++) {
  try {
    runOne(1000 + i);
  } catch {
    crashes++;
  }
}

console.log(JSON.stringify({ runs, crashes }));
process.exit(crashes > 0 ? 1 : 0);
