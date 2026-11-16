import { z } from "zod";
import {
  BOT_LEVELS,
  MAX_PLAYERS,
  MAX_POINTS,
  MIN_PLAYERS,
  MIN_POINTS,
} from "./game.js";

const name = z
  .string()
  .trim()
  .min(1, "Every player needs a name.")
  .max(15, "Names can be at most 15 characters.")
  .regex(/^[\p{L}\p{N} _.'-]+$/u, "Names may only contain letters, numbers, spaces and _ . ' -");

const player = z.object({
  name,
  avatar: z.number().int().min(0).max(28),
});

export const createGameSchema = z
  .object({
    mode: z.enum(["friends", "bot"]),
    botLevel: z.enum(BOT_LEVELS).optional(),
    maxPoints: z.number().int().min(MIN_POINTS).max(MAX_POINTS),
    players: z.array(player).max(MAX_PLAYERS),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "friends" && data.players.length < MIN_PLAYERS) {
      ctx.addIssue({ code: "custom", message: `Friends mode needs at least ${MIN_PLAYERS} players.`, path: ["players"] });
    }
    if (data.mode === "bot") {
      if (data.players.length < 1 || data.players.length > MAX_PLAYERS - 1) {
        ctx.addIssue({ code: "custom", message: "Computer mode needs 1 to 7 human players.", path: ["players"] });
      }
      if (!data.botLevel) {
        ctx.addIssue({ code: "custom", message: "Pick a difficulty for the computer.", path: ["botLevel"] });
      }
    }
    const names = data.players.map((p) => p.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      ctx.addIssue({ code: "custom", message: "Player names must be different.", path: ["players"] });
    }
  });

export const gameIdSchema = z.string().uuid("Invalid game id.");

export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const historyQuerySchema = z.object({
  name: z.string().trim().min(1).max(20).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
