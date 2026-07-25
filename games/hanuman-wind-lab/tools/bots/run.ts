import { runOne } from "./randomBot";

function flagNumber(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  const raw = index >= 0 ? process.argv[index + 1] : undefined;
  return raw ? Number(raw) : fallback;
}

const runs = flagNumber("--runs", 100);
let crashes = 0;
let wins = 0;
let timeouts = 0;
let totalSigils = 0;
let totalFalls = 0;
let runsBreakingBothSeals = 0;
let totalFormShifts = 0;
let runsUsingWindAnchors = 0;
let totalAnchorUses = 0;
let runsUsingAllWindAnchors = 0;

for (let index = 0; index < runs; index += 1) {
  try {
    const result = runOne(3000 + index);
    if (result.outcome === "won") wins += 1;
    else timeouts += 1;
    totalSigils += result.sigils;
    totalFalls += result.falls;
    if (result.sealsBroken === 2) runsBreakingBothSeals += 1;
    totalFormShifts += result.formShifts;
    if (result.anchorUses > 0) runsUsingWindAnchors += 1;
    totalAnchorUses += result.anchorUses;
    if (result.uniqueAnchorsUsed === result.totalAnchors) {
      runsUsingAllWindAnchors += 1;
    }
  } catch {
    crashes += 1;
  }
}

console.log(
  JSON.stringify({
    runs,
    crashes,
    wins,
    timeouts,
    winRate: runs > 0 ? Number((wins / runs).toFixed(3)) : 0,
    averageSigils: runs > 0 ? Number((totalSigils / runs).toFixed(2)) : 0,
    averageFalls: runs > 0 ? Number((totalFalls / runs).toFixed(2)) : 0,
    runsBreakingBothSeals,
    averageFormShifts:
      runs > 0 ? Number((totalFormShifts / runs).toFixed(2)) : 0,
    runsUsingWindAnchors,
    averageWindVaults:
      runs > 0 ? Number((totalAnchorUses / runs).toFixed(2)) : 0,
    runsUsingAllWindAnchors,
  }),
);
process.exit(
  crashes > 0 ||
    timeouts > 0 ||
    runsUsingWindAnchors !== runs ||
    runsUsingAllWindAnchors !== runs
    ? 1
    : 0,
);
