import { describe, expect, it } from "vitest";
import { emptyInput } from "../../src/sim/index";
import {
  bufferInput,
  consumeBufferedInput,
  createInputBuffer,
} from "../../src/platform/inputBuffer";

describe("movement input buffer", () => {
  it("preserves quick action presses until a simulation step", () => {
    let buffered = createInputBuffer();
    buffered = bufferInput(buffered, {
      ...emptyInput(),
      jumpPressed: true,
      jumpHeld: true,
    });
    buffered = bufferInput(buffered, { ...emptyInput(), dashPressed: true });
    buffered = bufferInput(buffered, { ...emptyInput(), formPressed: true });

    expect(consumeBufferedInput(buffered)).toMatchObject({
      jumpPressed: true,
      dashPressed: true,
      formPressed: true,
      jumpHeld: false,
    });
    expect(consumeBufferedInput(buffered)).toMatchObject({
      jumpPressed: false,
      dashPressed: false,
      formPressed: false,
    });
  });
});
