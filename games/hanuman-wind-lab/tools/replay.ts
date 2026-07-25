import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { z } from "zod";
import movement from "../content/design/movement.json";
import course from "../content/design/course.json";
import {
  createGame,
  step,
  type GameState,
  type Input,
} from "../src/sim/index";

const inputSchema = z
  .object({
    moveX: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
    jumpPressed: z.boolean(),
    jumpHeld: z.boolean(),
    dashPressed: z.boolean(),
    formPressed: z.boolean(),
    powerPressed: z.boolean(),
    attackPressed: z.boolean(),
    restart: z.boolean(),
  })
  .strict();

const finalProofSchema = z
  .object({
    stateHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    seed: z.number().int(),
    tick: z.number().int().nonnegative(),
    status: z.union([z.literal("playing"), z.literal("won")]),
    started: z.boolean(),
    elapsed: z.number().nonnegative(),
    player: z
      .object({
        x: z.number(),
        y: z.number(),
        vx: z.number(),
        vy: z.number(),
        form: z.union([z.literal("wind"), z.literal("mountain")]),
        onGround: z.boolean(),
        dashCount: z.number().int().nonnegative(),
        formShiftCount: z.number().int().nonnegative(),
        anchorUseCount: z.number().int().nonnegative(),
        earthSlamImpactCount: z.number().int().nonnegative(),
        attackCount: z.number().int().nonnegative(),
        sentryDefeatCount: z.number().int().nonnegative(),
        sentryHitCount: z.number().int().nonnegative(),
        shadowWaveHitCount: z.number().int().nonnegative(),
      })
      .strict(),
    sigilsCollected: z.array(z.boolean()),
    sealsBroken: z.array(z.boolean()),
    sentriesDefeated: z.array(z.boolean()),
    shadowWavesActive: z.number().int().nonnegative(),
    falls: z.number().int().nonnegative(),
  })
  .strict();

export const replaySchema = z
  .object({
    version: z.literal(2),
    contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    seed: z.number().int().min(0).max(0xffffffff),
    fixedDt: z.number().positive().max(1),
    inputs: z.array(inputSchema),
    expected: z
      .object({
        outcome: z.union([z.literal("playing"), z.literal("won")]),
        finalProof: finalProofSchema,
      })
      .strict(),
  })
  .strict();

export const replayCaptureSchema = z
  .object({
    version: z.literal(1),
    seed: z.number().int().min(0).max(0xffffffff),
    fixedDt: z.number().positive().max(1),
    inputs: z.array(inputSchema),
    contentFingerprint: z.string().min(1),
    finalStateJson: z.string().min(1),
  })
  .strict();

export type ReplayFile = z.infer<typeof replaySchema>;
export type ReplayCapture = z.infer<typeof replayCaptureSchema>;
export type FinalProof = z.infer<typeof finalProofSchema>;

export const REPLAY_CONTENT_FINGERPRINT = JSON.stringify({
  movement,
  course,
});
export const REPLAY_CONTENT_HASH = hashJson({ movement, course });

export class ReplayMismatchError extends Error {
  constructor(
    readonly expected: ReplayFile["expected"],
    readonly actual: FinalProof,
  ) {
    super(
      [
        "replay mismatch",
        `expected: ${JSON.stringify(expected)}`,
        `actual: ${JSON.stringify({
          outcome: actual.status,
          finalProof: actual,
        })}`,
      ].join("\n"),
    );
    this.name = "ReplayMismatchError";
  }
}

export function parseReplay(value: unknown): ReplayFile {
  return replaySchema.parse(value);
}

export function buildReplay(capture: ReplayCapture): ReplayFile {
  const parsedCapture = replayCaptureSchema.parse(capture);
  if (parsedCapture.contentFingerprint !== REPLAY_CONTENT_FINGERPRINT) {
    throw new Error("capture content does not match the current game content");
  }
  const finalState = simulateState(
    parsedCapture.seed,
    parsedCapture.fixedDt,
    parsedCapture.inputs,
  );
  if (JSON.stringify(finalState) !== parsedCapture.finalStateJson) {
    throw new Error(
      "capture final state does not match the current deterministic simulation",
    );
  }
  const finalProof = makeFinalProof(finalState);
  return {
    version: 2,
    contentHash: REPLAY_CONTENT_HASH,
    seed: parsedCapture.seed,
    fixedDt: parsedCapture.fixedDt,
    inputs: parsedCapture.inputs,
    expected: {
      outcome: finalProof.status,
      finalProof,
    },
  };
}

export function simulateReplay(
  seed: number,
  fixedDt: number,
  inputs: readonly Input[],
): FinalProof {
  return makeFinalProof(simulateState(seed, fixedDt, inputs));
}

export function simulateState(
  seed: number,
  fixedDt: number,
  inputs: readonly Input[],
): GameState {
  let state = createGame(seed);
  for (const input of inputs) {
    state = step(state, input, fixedDt);
  }
  return state;
}

export function runReplay(replay: ReplayFile): FinalProof {
  if (replay.contentHash !== REPLAY_CONTENT_HASH) {
    throw new Error(
      `content hash mismatch: replay ${replay.contentHash}, current ${REPLAY_CONTENT_HASH}`,
    );
  }
  const actual = simulateReplay(replay.seed, replay.fixedDt, replay.inputs);
  const actualResult = {
    outcome: actual.status,
    finalProof: actual,
  };
  if (!isDeepStrictEqual(actualResult, replay.expected)) {
    throw new ReplayMismatchError(replay.expected, actual);
  }
  return actual;
}

export function loadReplayFile(file: string): ReplayFile {
  const raw = readFileSync(file, "utf8");
  return parseReplay(JSON.parse(raw) as unknown);
}

export interface ReplayCliIo {
  log(message: string): void;
  error(message: string): void;
}

export function replayCli(
  args: readonly string[],
  io: ReplayCliIo = console,
): number {
  if (args[0] === "--record") {
    const captureFile = args[1];
    const replayFile = args[2];
    if (!captureFile || !replayFile) {
      io.error(
        "usage: pnpm replay --record <browser-capture.json> <replay-file.json>",
      );
      return 2;
    }
    try {
      const capture = replayCaptureSchema.parse(
        JSON.parse(readFileSync(captureFile, "utf8")) as unknown,
      );
      const replay = buildReplay(capture);
      writeFileSync(replayFile, `${JSON.stringify(replay, null, 2)}\n`);
      io.log(
        `replay recorded: ${replay.inputs.length} ticks (seed ${replay.seed})`,
      );
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      io.error(`invalid capture: ${message}`);
      return 2;
    }
  }

  const file = args[0];
  if (!file) {
    io.error("usage: pnpm replay <replay-file.json>");
    return 2;
  }

  try {
    const proof = runReplay(loadReplayFile(file));
    io.log(
      `replay matched: ${proof.status} after ${proof.tick} ticks (seed ${proof.seed})`,
    );
    return 0;
  } catch (error) {
    if (error instanceof ReplayMismatchError) {
      io.error(error.message);
      return 1;
    }
    const message = error instanceof Error ? error.message : String(error);
    io.error(`invalid replay: ${message}`);
    return 2;
  }
}

function makeFinalProof(state: GameState): FinalProof {
  return {
    stateHash: hashJson(state),
    seed: state.seed,
    tick: state.tick,
    status: state.status,
    started: state.started,
    elapsed: state.elapsed,
    player: {
      x: state.player.x,
      y: state.player.y,
      vx: state.player.vx,
      vy: state.player.vy,
      form: state.player.form,
      onGround: state.player.onGround,
      dashCount: state.player.dashCount,
      formShiftCount: state.player.formShiftCount,
      anchorUseCount: state.player.anchorUseCount,
      earthSlamImpactCount: state.player.earthSlamImpactCount,
      attackCount: state.player.attackCount,
      sentryDefeatCount: state.shadowSentries.filter(
        (sentry) => sentry.defeated,
      ).length,
      sentryHitCount: state.player.sentryHitCount,
      shadowWaveHitCount: state.player.shadowWaveHitCount,
    },
    sigilsCollected: state.sigils.map((sigil) => sigil.collected),
    sealsBroken: state.seals.map((seal) => seal.broken),
    sentriesDefeated: state.shadowSentries.map((sentry) => sentry.defeated),
    shadowWavesActive: state.shadowWaves.length,
    falls: state.falls,
  };
}

function hashJson(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

const invokedFile = process.argv[1];
if (
  invokedFile !== undefined &&
  resolve(invokedFile) === resolve(fileURLToPath(import.meta.url))
) {
  process.exitCode = replayCli(process.argv.slice(2));
}
