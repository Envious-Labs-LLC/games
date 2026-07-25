import { z } from "zod";

const positiveNumber = z.number().positive();

export const movementSchema = z.object({
  worldWidth: z.number().int().min(960),
  worldHeight: z.number().int().min(540),
  runSpeed: positiveNumber,
  groundAcceleration: positiveNumber,
  airAcceleration: positiveNumber,
  friction: positiveNumber,
  gravity: positiveNumber,
  jumpSpeed: positiveNumber,
  jumpHoldForce: positiveNumber,
  jumpHoldTime: positiveNumber,
  maxFallSpeed: positiveNumber,
  glideFallSpeed: positiveNumber,
  dashSpeed: positiveNumber,
  dashDuration: positiveNumber,
  mountainForm: z.object({
    runSpeed: positiveNumber,
    jumpSpeed: positiveNumber,
    gravity: positiveNumber,
    dashSpeed: positiveNumber,
    wallSlideSpeed: positiveNumber,
  }),
  wallSlideSpeed: positiveNumber,
  wallJumpX: positiveNumber,
  coyoteTime: positiveNumber,
  jumpBufferTime: positiveNumber,
});

const pointSchema = z.object({ x: z.number().nonnegative(), y: z.number().nonnegative() });
const platformSchema = pointSchema.extend({
  width: positiveNumber,
  height: positiveNumber,
});

export const courseSchema = z.object({
  platforms: z.array(platformSchema).min(1),
  sigils: z.array(pointSchema).min(1),
  seals: z.array(platformSchema),
  finish: pointSchema,
});
