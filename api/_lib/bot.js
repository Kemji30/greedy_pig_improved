// The computer opponent. Pure logic, runs on the server so it cannot be tampered with.
import { applyHold, applyRoll, serverDie } from "./game.js";

// How many turn points each bot level is happy with before it banks them.
const HOLD_AT = { easy: 10, medium: 20, hard: 25 };

export function botShouldHold(state) {
  const me = state.players[state.currentPlayer];
  const level = state.botLevel ?? "easy";
  if (me.running === 0) return false;

  if (level !== "hard") return me.running >= HOLD_AT[level];

  // Hard bot adapts to the scoreboard.
  const bestOther = Math.max(
    ...state.players.filter((p) => p !== me).map((p) => p.total)
  );
  const opponentNearWin = bestOther >= state.maxPoints - 20;
  const farAhead = me.total - bestOther >= 25;

  if (opponentNearWin) return me.running >= 40; // must take risks
  if (farAhead) return me.running >= 15; // protect the lead
  return me.running >= HOLD_AT.hard;
}

// Plays every consecutive bot turn on the server. Returns { state, events }.
export function runBotTurns(startState, rng = serverDie) {
  let state = startState;
  const events = [];
  let guard = 0;

  while (
    state.status === "active" &&
    state.players[state.currentPlayer].isBot &&
    guard++ < 500
  ) {
    const rolled = applyRoll(state, rng());
    state = rolled.state;
    events.push(...rolled.events);
    if (state.status !== "active") break;
    if (!state.players[state.currentPlayer].isBot) break; // bot busted

    if (botShouldHold(state)) {
      const held = applyHold(state);
      state = held.state;
      events.push(...held.events);
    }
  }
  return { state, events };
}
