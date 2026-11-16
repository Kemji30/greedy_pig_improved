import test from "node:test";
import assert from "node:assert/strict";
import { GameError, applyHold, applyRoll, createGameState } from "../api/_lib/game.js";

const base = (over = {}) =>
  createGameState({
    id: "g1",
    players: [{ name: "Ann", avatar: 0 }, { name: "Bob", avatar: 1 }],
    maxPoints: 100,
    mode: "friends",
    ...over,
  });

test("rolling 2-6 adds to the running total and keeps the turn", () => {
  const { state } = applyRoll(base(), 4);
  assert.equal(state.players[0].running, 4);
  assert.equal(state.currentPlayer, 0);
});

test("rolling a 1 wipes the turn total and passes the turn", () => {
  let s = applyRoll(base(), 5).state;
  const { state, events } = applyRoll(s, 1);
  assert.equal(state.players[0].running, 0);
  assert.equal(state.players[0].total, 0);
  assert.equal(state.currentPlayer, 1);
  assert.equal(events[0].type, "bust");
});

test("holding banks the points and passes the turn", () => {
  let s = applyRoll(base(), 6).state;
  s = applyRoll(s, 3).state;
  const { state } = applyHold(s);
  assert.equal(state.players[0].total, 9);
  assert.equal(state.players[0].running, 0);
  assert.equal(state.currentPlayer, 1);
});

test("cannot hold before rolling", () => {
  assert.throws(() => applyHold(base()), GameError);
});

test("reaching the max points wins and finishes the game", () => {
  let s = base({ maxPoints: 25 });
  for (let i = 0; i < 4; i++) s = applyRoll(s, 6).state; // 24
  const { state, events } = applyRoll(s, 2); // 26
  assert.equal(state.status, "finished");
  assert.equal(state.winner, 0);
  assert.equal(events.at(-1).type, "win");
});

test("a finished game rejects further moves", () => {
  let s = base({ maxPoints: 25 });
  for (let i = 0; i < 5; i++) s = applyRoll(s, 6).state;
  assert.equal(s.status, "finished");
  assert.throws(() => applyRoll(s, 3), GameError);
  assert.throws(() => applyHold(s), GameError);
});

test("invalid die values are refused", () => {
  assert.throws(() => applyRoll(base(), 7));
  assert.throws(() => applyRoll(base(), 0));
});
