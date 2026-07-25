import { runOne } from "./randomBot";

function flagNumber(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  const raw = index >= 0 ? process.argv[index + 1] : undefined;
  return raw ? Number(raw) : fallback;
}

const runs = flagNumber("--runs", 100);
let crashes = 0;
let wins = 0;
let losses = 0;
let timeouts = 0;
let totalScore = 0;

for (let index = 0; index < runs; index += 1) {
  try {
    const result = runOne(1000 + index);
    totalScore += result.score;
    if (result.outcome === "won") wins += 1;
    else if (result.outcome === "lost") losses += 1;
    else timeouts += 1;
  } catch {
    crashes += 1;
  }
}

console.log(
  JSON.stringify({
    runs,
    crashes,
    wins,
    losses,
    timeouts,
    winRate: runs > 0 ? Number((wins / runs).toFixed(3)) : 0,
    averageScore: runs > 0 ? Math.round(totalScore / runs) : 0,
  }),
);
process.exit(crashes > 0 ? 1 : 0);
