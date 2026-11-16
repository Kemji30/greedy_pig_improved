import test from "node:test";
import assert from "node:assert/strict";
import { createGameState } from "../api/_lib/game.js";
import { botShouldHold, runBotTurns } from "../api/_lib/bot.js";
import { fixedDice } from "./fakeDb.js";

test("bot thresholds: easy 10, medium 20", () => {
  const make = (level, running) => {
    const s = createGameState({
      id: "b", players: [{ name: "Ann", avatar: 0 }], maxPoints: 100, mode: "bot", botLevel: level,
    });
    s.currentPlayer = 1;
    s.players[1].running = running;
    return s;
  };
  assert.equal(botShouldHold(make("easy", 9)), false);
  assert.equal(botShouldHold(make("easy", 10)), true);
  assert.equal(botShouldHold(make("medium", 19)), false);
  assert.equal(botShouldHold(make("medium", 20)), true);
});

test("hard bot takes more risk when an opponent is close to winning", () => {
  const s = createGameState({
    id: "b", players: [{ name: "Ann", avatar: 0 }], maxPoints: 100, mode: "bot", botLevel: "hard",
  });
  s.currentPlayer = 1;
  s.players[1].running = 30;
  assert.equal(botShouldHold(s), true); // normal: holds at 25
  s.players[0].total = 85; // opponent near the finish
  assert.equal(botShouldHold(s), false); // now keeps rolling until 40
  s.players[1].running = 40;
  assert.equal(botShouldHold(s), true);
});

test("bot turn runs on the server and hands back to the human", () => {
  let s = createGameState({
    id: "b", players: [{ name: "Ann", avatar: 0 }], maxPoints: 100, mode: "bot", botLevel: "easy",
  });
  s.currentPlayer = 1;
  const { state, events } = runBotTurns(s, fixedDice(6, 6, 3)); // 12 >= 10 -> hold
  assert.equal(state.players[1].total, 12);
  assert.equal(state.currentPlayer, 0);
  assert.deepEqual(events.map((e) => e.type), ["roll", "roll", "hold"]);
});

test("bot rolling a 1 loses its turn points", () => {
  let s = createGameState({
    id: "b", players: [{ name: "Ann", avatar: 0 }], maxPoints: 100, mode: "bot", botLevel: "easy",
  });
  s.currentPlayer = 1;
  const { state } = runBotTurns(s, fixedDice(5, 1));
  assert.equal(state.players[1].total, 0);
  assert.equal(state.currentPlayer, 0);
});
