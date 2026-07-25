import { describe, expect, it } from "vitest";
import { emptyInput } from "../../src/sim/index";
import {
  bufferInput,
  consumeBufferedInput,
  createInputBuffer,
} from "../../src/platform/inputBuffer";

describe("movement input buffer", () => {
  it("preserves quick jump and dash presses until a simulation step", () => {
    let buffered = createInputBuffer();
    buffered = bufferInput(buffered, {
      ...emptyInput(),
      jumpPressed: true,
      jumpHeld: true,
    });
    buffered = bufferInput(buffered, { ...emptyInput(), dashPressed: true });

    expect(consumeBufferedInput(buffered)).toMatchObject({
      jumpPressed: true,
      dashPressed: true,
      jumpHeld: false,
    });
    expect(consumeBufferedInput(buffered)).toMatchObject({
      jumpPressed: false,
      dashPressed: false,
    });
  });
});
