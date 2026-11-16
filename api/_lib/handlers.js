// The API logic. Each handler is a plain (req, res) function, and `makeHandlers`
// receives the database and the dice so tests can control both.
import { randomUUID } from "node:crypto";
import {
  GameError,
  applyHold,
  applyRoll,
  createGameState,
  serverDie,
} from "./game.js";
import { runBotTurns } from "./bot.js";
import {
  createGameSchema,
  gameIdSchema,
  historyQuerySchema,
  leaderboardQuerySchema,
} from "./validate.js";

function readBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new GameError("Request body must be valid JSON.", 400);
    }
  }
  return req.body ?? {};
}

function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(" ");
    throw new GameError(message, 400);
  }
  return result.data;
}

// Wraps a handler so every error becomes a clean JSON response.
function route(method, fn) {
  return async (req, res) => {
    try {
      if (req.method !== method) {
        res.setHeader?.("Allow", method);
        throw new GameError(`Use ${method} for this endpoint.`, 405);
      }
      const body = await fn(req);
      res.status(200).json(body);
    } catch (error) {
      if (error instanceof GameError) {
        res.status(error.status).json({ error: error.message });
      } else {
        console.error(error);
        res.status(500).json({ error: "Something went wrong on the server." });
      }
    }
  };
}

// What the browser is allowed to see.
const publicState = (state) => ({
  id: state.id,
  mode: state.mode,
  botLevel: state.botLevel,
  maxPoints: state.maxPoints,
  status: state.status,
  currentPlayer: state.currentPlayer,
  winner: state.winner,
  rolls: state.rolls,
  players: state.players,
});

export function makeHandlers(db, { rng = serverDie } = {}) {
  async function load(req) {
    const id = parse(gameIdSchema, req.query?.id);
    const state = await db.getGame(id);
    if (!state) throw new GameError("Game not found.", 404);
    return state;
  }

  // Saves the new state; records the result the moment a game finishes.
  async function commit(before, after) {
    after.version = before.version + 1;
    const saved = await db.saveGame(after, before.version);
    if (!saved) {
      throw new GameError("The game changed while you were playing. Please try again.", 409);
    }
    if (before.status === "active" && after.status === "finished") {
      const winner = after.players[after.winner];
      await db.insertResult({
        game_id: after.id,
        mode: after.mode,
        bot_level: after.botLevel,
        max_points: after.maxPoints,
        winner_name: winner.name,
        winner_is_bot: winner.isBot,
        rolls: after.rolls,
        players: after.players.map((p) => ({ name: p.name, isBot: p.isBot, total: p.total })),
        player_names: after.players.filter((p) => !p.isBot).map((p) => p.name.toLowerCase()),
      });
    }
  }

  const createGame = route("POST", async (req) => {
    const input = parse(createGameSchema, readBody(req));
    const state = createGameState({ id: randomUUID(), ...input });
    await db.insertGame(state);
    return { game: publicState(state), events: [] };
  });

  // The browser only says "roll". The server rolls the die and keeps the score.
  const roll = route("POST", async (req) => {
    const before = await load(req);
    if (before.players[before.currentPlayer].isBot) {
      throw new GameError("It is the computer's turn.");
    }
    let { state, events } = applyRoll(before, rng());
    if (state.status === "active") {
      const bots = runBotTurns(state, rng);
      state = bots.state;
      events = events.concat(bots.events);
    }
    await commit(before, state);
    return { game: publicState(state), events };
  });

  const hold = route("POST", async (req) => {
    const before = await load(req);
    if (before.players[before.currentPlayer].isBot) {
      throw new GameError("It is the computer's turn.");
    }
    let { state, events } = applyHold(before);
    const bots = runBotTurns(state, rng);
    state = bots.state;
    events = events.concat(bots.events);
    await commit(before, state);
    return { game: publicState(state), events };
  });

  const getGame = route("GET", async (req) => ({ game: publicState(await load(req)) }));

  // Wins and games played per human player, built from finished games.
  const leaderboard = route("GET", async (req) => {
    const { limit } = parse(leaderboardQuerySchema, req.query ?? {});
    const results = await db.recentResults({ limit: 1000 });
    const table = new Map();
    for (const match of results) {
      for (const p of match.players.filter((x) => !x.isBot)) {
        const key = p.name.toLowerCase();
        const row = table.get(key) ?? { name: p.name, played: 0, wins: 0 };
        row.played += 1;
        if (!match.winner_is_bot && match.winner_name.toLowerCase() === key) row.wins += 1;
        table.set(key, row);
      }
    }
    const rows = [...table.values()]
      .map((r) => ({ ...r, winRate: Math.round((r.wins / r.played) * 100) }))
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, ...r }));
    return { leaderboard: rows };
  });

  // Recent matches (everyone, or one player) plus that player's stats.
  const history = route("GET", async (req) => {
    const { name, limit } = parse(historyQuerySchema, req.query ?? {});
    const matches = await db.recentResults({ limit, name });
    const out = { matches: matches.map(toMatch) };
    if (name) {
      const all = await db.recentResults({ limit: 200, name });
      const wins = all.filter(
        (m) => !m.winner_is_bot && m.winner_name.toLowerCase() === name.toLowerCase()
      ).length;
      out.stats = {
        name,
        played: all.length,
        wins,
        winRate: all.length ? Math.round((wins / all.length) * 100) : 0,
      };
    }
    return out;
  });

  return { createGame, roll, hold, getGame, leaderboard, history };
}

function toMatch(m) {
  return {
    id: m.id,
    when: m.created_at,
    mode: m.mode,
    botLevel: m.bot_level,
    maxPoints: m.max_points,
    winner: m.winner_name,
    winnerIsBot: m.winner_is_bot,
    rolls: m.rolls,
    players: m.players,
  };
}
