import { z } from "zod";

const positiveNumber = z.number().positive();

export const balanceSchema = z.object({
  worldWidth: z.number().int().min(960),
  groundY: z.number().int().min(300).max(500),
  player: z.object({
    maxHealth: positiveNumber,
    runSpeed: positiveNumber,
    jumpSpeed: positiveNumber,
    lightDamage: positiveNumber,
    heavyDamage: positiveNumber,
  }),
  enemies: z.object({
    raiderHealth: positiveNumber,
    raiderDamage: positiveNumber,
    bruteHealth: positiveNumber,
    bruteDamage: positiveNumber,
  }),
});
