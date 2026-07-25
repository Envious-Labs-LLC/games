import { emptyInput, type Input } from "../sim/index";

export function createInputBuffer(): Input {
  return emptyInput();
}

export function bufferInput(buffered: Input, observed: Input): Input {
  return {
    moveX: observed.moveX,
    jumpPressed: buffered.jumpPressed || observed.jumpPressed,
    jumpHeld: observed.jumpHeld,
    dashPressed: buffered.dashPressed || observed.dashPressed,
    restart: buffered.restart || observed.restart,
  };
}

export function consumeBufferedInput(buffered: Input): Input {
  const consumed = { ...buffered };
  buffered.jumpPressed = false;
  buffered.dashPressed = false;
  buffered.restart = false;
  return consumed;
}
