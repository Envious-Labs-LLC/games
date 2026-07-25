import { emptyInput, type Input } from "../sim/index";

export function bufferInput(buffered: Input, observed: Input): Input {
  return {
    moveX: observed.moveX,
    jump: buffered.jump || observed.jump,
    light: buffered.light || observed.light,
    heavy: buffered.heavy || observed.heavy,
    restart: buffered.restart || observed.restart,
  };
}

export function consumeBufferedInput(buffered: Input): Input {
  const consumed = { ...buffered };
  buffered.jump = false;
  buffered.light = false;
  buffered.heavy = false;
  buffered.restart = false;
  return consumed;
}

export function createInputBuffer(): Input {
  return emptyInput();
}
