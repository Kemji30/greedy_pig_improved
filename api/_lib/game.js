// Pure game rules. No network, no database, no randomness hidden inside:
// the dice come in through the `rng` function so the rules can be tested.
import { randomInt } from "node:crypto";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const MIN_POINTS = 25;
export const MAX_POINTS = 500;
export const BOT_LEVELS = ["easy", "medium", "hard"];

// The only place a die is rolled. crypto.randomInt is unpredictable.
export const serverDie = () => randomInt(1, 7);

export class GameError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}

export function createGameState({ id, players, maxPoints, mode, botLevel }) {
  const list = players.map((p) => ({
    name: p.name,
    avatar: p.avatar,
    isBot: false,
    total: 0,
    running: 0,
  }));

  if (mode === "bot") {
    list.push({
      name: `Computer (${botLevel})`,
      avatar: 28, // the bot always plays as the last pig image
      isBot: true,
      total: 0,
      running: 0,
    });
  }

  return {
    id,
    version: 0,
    mode,
    botLevel: mode === "bot" ? botLevel : null,
    maxPoints,
    status: "active",
    currentPlayer: 0,
    winner: null,
    rolls: 0,
    players: list,
  };
}

function nextPlayer(state) {
  return (state.currentPlayer + 1) % state.players.length;
}

function assertActive(state) {
  if (state.status !== "active") {
    throw new GameError("This game is already finished.");
  }
}

// Applies one roll made by the current player. Returns { state, events }.
export function applyRoll(oldState, value) {
  assertActive(oldState);
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new GameError("Invalid die value.", 500);
  }
  const state = structuredClone(oldState);
  const index = state.currentPlayer;
  const player = state.players[index];
  const events = [];
  state.rolls += 1;

  if (value === 1) {
    player.running = 0;
    state.currentPlayer = nextPlayer(state);
    events.push({ type: "bust", player: index, value });
    return { state, events };
  }

  player.running += value;
  events.push({ type: "roll", player: index, value });

  if (player.total + player.running >= state.maxPoints) {
    player.total += player.running;
    player.running = 0;
    state.status = "finished";
    state.winner = index;
    events.push({ type: "win", player: index });
  }
  return { state, events };
}

// The current player banks their running points and the turn moves on.
export function applyHold(oldState) {
  assertActive(oldState);
  const state = structuredClone(oldState);
  const index = state.currentPlayer;
  const player = state.players[index];
  if (player.running === 0) {
    throw new GameError("Roll at least once before passing.");
  }
  player.total += player.running;
  const banked = player.running;
  player.running = 0;
  state.currentPlayer = nextPlayer(state);
  return { state, events: [{ type: "hold", player: index, banked }] };
}
