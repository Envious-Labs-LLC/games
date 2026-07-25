import {
  runOne,
  runRecoveryProfile,
  runSlamCounterProfile,
} from "./randomBot";

function flagNumber(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  const raw = index >= 0 ? process.argv[index + 1] : undefined;
  return raw ? Number(raw) : fallback;
}

const runs = flagNumber("--runs", 100);
if (!Number.isInteger(runs) || runs <= 0) {
  console.error("--runs must be a positive integer");
  process.exit(2);
}
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
let totalEarthSlamStarts = 0;
let totalEarthSlamImpacts = 0;
let runsStartingEarthSlam = 0;
let runsLandingEarthSlam = 0;
let runsBreakingExactlyOneSealWithEarthSlam = 0;
let runsDefeatingAllSentries = 0;
let runsUsingDashOnSentry = 0;
let runsUsingEarthSlamOnSentry = 0;
let totalSentryHits = 0;
let runsSeeingShadowWave = 0;
let totalShadowWaveHits = 0;
let runsUsingGadaOnSentry = 0;
let recoveryProfilesPassing = 0;
let slamCounterProfilesPassing = 0;
const gameplayPaths = new Set<string>();
const routeVariantsRun = new Set<number>();

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
    totalEarthSlamStarts += result.earthSlamStarts;
    totalEarthSlamImpacts += result.earthSlamImpacts;
    if (result.earthSlamStarts > 0) runsStartingEarthSlam += 1;
    if (result.earthSlamImpacts > 0) runsLandingEarthSlam += 1;
    if (result.earthSlamSealBreaks === 1) {
      runsBreakingExactlyOneSealWithEarthSlam += 1;
    }
    if (result.sentriesDefeated === result.totalSentries) {
      runsDefeatingAllSentries += 1;
    }
    if (result.sentryDashDefeats > 0) runsUsingDashOnSentry += 1;
    if (result.earthSlamSentryDefeats > 0) {
      runsUsingEarthSlamOnSentry += 1;
    }
    totalSentryHits += result.sentryHits;
    if (result.shadowWavesFired > 0) runsSeeingShadowWave += 1;
    totalShadowWaveHits += result.shadowWaveHits;
    if (result.gadaDefeats > 0) runsUsingGadaOnSentry += 1;
    gameplayPaths.add(
      [
        result.ticks,
        result.jumpCommands,
        result.dashCommands,
        result.formShifts,
      ].join(":"),
    );
    routeVariantsRun.add(result.routeVariant);
    const recovery = runRecoveryProfile(5000 + index);
    if (
      recovery.waveHitRecovered &&
      recovery.fallRecovered &&
      recovery.wavesClearedAfterHit
    ) {
      recoveryProfilesPassing += 1;
    }
    const slamCounter = runSlamCounterProfile(7000 + index);
    if (
      slamCounter.waveDispelled &&
      slamCounter.playerRecoveredOnGround
    ) {
      slamCounterProfilesPassing += 1;
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
    runsStartingEarthSlam,
    runsLandingEarthSlam,
    runsBreakingExactlyOneSealWithEarthSlam,
    runsDefeatingAllSentries,
    runsUsingDashOnSentry,
    runsUsingEarthSlamOnSentry,
    totalSentryHits,
    runsSeeingShadowWave,
    totalShadowWaveHits,
    runsUsingGadaOnSentry,
    recoveryProfilesPassing,
    slamCounterProfilesPassing,
    distinctGameplayPaths: gameplayPaths.size,
    routeVariantsRun: routeVariantsRun.size,
    averageEarthSlams:
      runs > 0 ? Number((totalEarthSlamImpacts / runs).toFixed(2)) : 0,
  }),
);
process.exit(
  crashes > 0 ||
    timeouts > 0 ||
    runsUsingWindAnchors !== runs ||
    runsUsingAllWindAnchors !== runs ||
    runsBreakingBothSeals !== runs ||
    runsStartingEarthSlam !== runs ||
    runsLandingEarthSlam !== runs ||
    runsBreakingExactlyOneSealWithEarthSlam !== runs ||
    runsDefeatingAllSentries !== runs ||
    runsUsingDashOnSentry !== runs ||
    runsUsingGadaOnSentry !== runs ||
    recoveryProfilesPassing !== runs ||
    slamCounterProfilesPassing !== runs ||
    gameplayPaths.size < Math.min(3, runs) ||
    routeVariantsRun.size < Math.min(3, runs) ||
    totalSentryHits !== 0 ||
    runsSeeingShadowWave !== runs ||
    totalShadowWaveHits !== 0 ||
    totalEarthSlamStarts !== totalEarthSlamImpacts
    ? 1
    : 0,
);
