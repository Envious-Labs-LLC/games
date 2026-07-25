import { describe, expect, it } from "vitest";
import { emptyInput } from "../../src/sim/index";
import {
  bufferInput,
  consumeBufferedInput,
  createInputBuffer,
} from "../../src/platform/inputBuffer";

describe("input buffer", () => {
  it("keeps a quick jump until a simulation step consumes it", () => {
    let buffered = createInputBuffer();
    buffered = bufferInput(buffered, { ...emptyInput(), jump: true });
    buffered = bufferInput(buffered, emptyInput());

    expect(consumeBufferedInput(buffered).jump).toBe(true);
    expect(consumeBufferedInput(buffered).jump).toBe(false);
  });

  it("keeps attack clicks while using the latest movement direction", () => {
    let buffered = createInputBuffer();
    buffered = bufferInput(buffered, { ...emptyInput(), moveX: 1, light: true });
    buffered = bufferInput(buffered, { ...emptyInput(), moveX: -1, heavy: true });

    expect(consumeBufferedInput(buffered)).toMatchObject({
      moveX: -1,
      light: true,
      heavy: true,
    });
  });
});
