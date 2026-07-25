import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { emptyInput, FIXED_DT, type Input } from "../../src/sim/index";
import {
  parseReplay,
  buildReplay,
  REPLAY_CONTENT_HASH,
  REPLAY_CONTENT_FINGERPRINT,
  replayCli,
  loadReplayFile,
  runReplay,
  simulateReplay,
  simulateState,
  type ReplayFile,
} from "../../tools/replay";

function makeReplay(inputs: Input[]): ReplayFile {
  const finalProof = simulateReplay(205, FIXED_DT, inputs);
  return {
    version: 2,
    contentHash: REPLAY_CONTENT_HASH,
    seed: 205,
    fixedDt: FIXED_DT,
    inputs,
    expected: {
      outcome: finalProof.status,
      finalProof,
    },
  };
}

function captureIo(): {
  messages: string[];
  io: { log(message: string): void; error(message: string): void };
} {
  const messages: string[] = [];
  return {
    messages,
    io: {
      log: (message) => messages.push(message),
      error: (message) => messages.push(message),
    },
  };
}

describe("deterministic replay harness", () => {
  it("matches the checked-in movement baseline across code changes", () => {
    const replay = loadReplayFile(
      join(
        process.cwd(),
        "tests/fixtures/replays/movement-baseline.v2.json",
      ),
    );

    expect(runReplay(replay).stateHash).toBe(
      "sha256:e0b7c7dfd54e7debd1bb3f980608b34aad561a60ea6ddbb56eef0437d14d4219",
    );
  });

  it("replays a serialized input stream to the exact final proof", () => {
    const inputs = Array.from({ length: 120 }, (_, tick): Input => ({
      ...emptyInput(),
      moveX: tick < 90 ? 1 : 0,
      jumpPressed: tick === 8,
      jumpHeld: tick >= 8 && tick < 24,
      dashPressed: tick === 50,
      formPressed: tick === 80,
      attackPressed: tick === 95,
    }));
    const replay = makeReplay(inputs);

    expect(runReplay(parseReplay(JSON.parse(JSON.stringify(replay))))).toEqual(
      replay.expected.finalProof,
    );
  });

  it("turns a browser input capture into a verified replay", () => {
    const inputs = [
      { ...emptyInput(), moveX: 1 as const },
      { ...emptyInput(), jumpPressed: true },
    ];
    const replay = buildReplay({
      version: 1,
      seed: 205,
      fixedDt: FIXED_DT,
      inputs,
      contentFingerprint: REPLAY_CONTENT_FINGERPRINT,
      finalStateJson: JSON.stringify(
        simulateState(205, FIXED_DT, inputs),
      ),
    });

    expect(replay.contentHash).toBe(REPLAY_CONTENT_HASH);
    expect(runReplay(replay)).toEqual(replay.expected.finalProof);
  });

  it("rejects stale content or browser state during capture conversion", () => {
    const inputs = [{ ...emptyInput(), moveX: 1 as const }];
    const finalStateJson = JSON.stringify(
      simulateState(205, FIXED_DT, inputs),
    );
    const capture = {
      version: 1 as const,
      seed: 205,
      fixedDt: FIXED_DT,
      inputs,
      contentFingerprint: REPLAY_CONTENT_FINGERPRINT,
      finalStateJson,
    };

    expect(() =>
      buildReplay({ ...capture, contentFingerprint: "stale" }),
    ).toThrow(/content does not match/);
    expect(() =>
      buildReplay({ ...capture, finalStateJson: "{}" }),
    ).toThrow(/final state does not match/);
  });

  it("fails when the recorded outcome does not match", () => {
    const replay = makeReplay([
      { ...emptyInput(), moveX: 1 },
      { ...emptyInput(), jumpPressed: true },
    ]);
    replay.expected.finalProof.player.x += 1;

    expect(() => runReplay(replay)).toThrow(/replay mismatch/);
  });

  it("rejects a replay recorded against different game content", () => {
    const replay = makeReplay([emptyInput()]);
    replay.contentHash = `sha256:${"0".repeat(64)}`;

    expect(() => runReplay(replay)).toThrow(/content hash mismatch/);
  });

  it("rejects malformed input records instead of filling defaults", () => {
    const replay = makeReplay([emptyInput()]);
    const malformed = JSON.parse(JSON.stringify(replay)) as Record<
      string,
      unknown
    >;
    const inputs = malformed.inputs as Array<Record<string, unknown>>;
    delete inputs[0]!.attackPressed;

    expect(() => parseReplay(malformed)).toThrow();
  });

  it("returns distinct nonzero codes for mismatches and malformed files", () => {
    const folder = mkdtempSync(join(tmpdir(), "hanuman-replay-"));
    try {
      const matchingPath = join(folder, "matching.json");
      const mismatchPath = join(folder, "mismatch.json");
      const malformedPath = join(folder, "malformed.json");
      const capturePath = join(folder, "capture.json");
      const recordedPath = join(folder, "recorded.json");
      const matching = makeReplay([emptyInput()]);
      const mismatch = makeReplay([emptyInput()]);
      mismatch.expected.outcome =
        mismatch.expected.outcome === "won" ? "playing" : "won";
      writeFileSync(matchingPath, JSON.stringify(matching));
      writeFileSync(mismatchPath, JSON.stringify(mismatch));
      writeFileSync(malformedPath, "{not json");
      writeFileSync(
        capturePath,
        JSON.stringify({
          version: 1,
          seed: 205,
          fixedDt: FIXED_DT,
          inputs: [emptyInput()],
          contentFingerprint: REPLAY_CONTENT_FINGERPRINT,
          finalStateJson: JSON.stringify(
            simulateState(205, FIXED_DT, [emptyInput()]),
          ),
        }),
      );

      const matchingIo = captureIo();
      const mismatchIo = captureIo();
      const malformedIo = captureIo();
      expect(replayCli([matchingPath], matchingIo.io)).toBe(0);
      expect(matchingIo.messages.join("\n")).toMatch(/replay matched/);
      expect(replayCli([mismatchPath], mismatchIo.io)).toBe(1);
      expect(mismatchIo.messages.join("\n")).toMatch(/replay mismatch/);
      expect(replayCli([malformedPath], malformedIo.io)).toBe(2);
      expect(malformedIo.messages.join("\n")).toMatch(/invalid replay/);
      const recordIo = captureIo();
      expect(
        replayCli(
          ["--record", capturePath, recordedPath],
          recordIo.io,
        ),
      ).toBe(0);
      expect(runReplay(loadReplayFile(recordedPath)).tick).toBe(1);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
