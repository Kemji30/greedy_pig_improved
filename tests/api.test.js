import test from "node:test";
import assert from "node:assert/strict";
import { makeHandlers } from "../api/_lib/handlers.js";
import { call, fixedDice, makeFakeDb } from "./fakeDb.js";

const players = [{ name: "Ann", avatar: 0 }, { name: "Bob", avatar: 1 }];

async function start(h, over = {}) {
  const r = await call(h.createGame, {
    method: "POST",
    body: { mode: "friends", maxPoints: 100, players, ...over },
  });
  return r;
}

test("create game: validates input", async () => {
  const h = makeHandlers(makeFakeDb());
  assert.equal((await start(h, { maxPoints: 5 })).status, 400);
  assert.equal((await start(h, { players: [players[0]] })).status, 400);
  assert.equal((await start(h, { players: [players[0], { name: "ann", avatar: 2 }] })).status, 400);
  assert.equal((await start(h, { players: [players[0], { name: "<b>x</b>", avatar: 2 }] })).status, 400);
  assert.equal((await start(h, { mode: "bot", players: [players[0]] })).status, 400); // no botLevel
  assert.equal((await start(h, { mode: "zzz" })).status, 400);
});

test("create game: ok", async () => {
  const h = makeHandlers(makeFakeDb());
  const r = await start(h);
  assert.equal(r.status, 200);
  assert.equal(r.body.game.status, "active");
  assert.match(r.body.game.id, /^[0-9a-f-]{36}$/);
});

test("wrong HTTP method is rejected", async () => {
  const h = makeHandlers(makeFakeDb());
  assert.equal((await call(h.createGame, { method: "GET" })).status, 405);
  assert.equal((await call(h.leaderboard, { method: "POST" })).status, 405);
});

test("roll: the SERVER picks the die, the client cannot send one", async () => {
  const h = makeHandlers(makeFakeDb(), { rng: fixedDice(4) });
  const { body } = await start(h);
  const id = body.game.id;
  // A cheating client tries to force a six. The body is ignored.
  const r = await call(h.roll, { method: "POST", query: { id }, body: { value: 6, running: 99 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.events[0].value, 4);
  assert.equal(r.body.game.players[0].running, 4);
});

test("roll then hold updates the score on the server", async () => {
  const db = makeFakeDb();
  const h = makeHandlers(db, { rng: fixedDice(5, 3) });
  const id = (await start(h)).body.game.id;
  await call(h.roll, { method: "POST", query: { id } });
  await call(h.roll, { method: "POST", query: { id } });
  const r = await call(h.hold, { method: "POST", query: { id } });
  assert.equal(r.body.game.players[0].total, 8);
  assert.equal(r.body.game.currentPlayer, 1);
  assert.equal((await db.getGame(id)).players[0].total, 8);
});

test("hold before rolling is refused", async () => {
  const h = makeHandlers(makeFakeDb());
  const id = (await start(h)).body.game.id;
  const r = await call(h.hold, { method: "POST", query: { id } });
  assert.equal(r.status, 409);
});

test("bad or unknown game ids", async () => {
  const h = makeHandlers(makeFakeDb());
  assert.equal((await call(h.roll, { method: "POST", query: { id: "nope" } })).status, 400);
  assert.equal(
    (await call(h.roll, { method: "POST", query: { id: "11111111-1111-4111-8111-111111111111" } })).status,
    404
  );
});

test("computer mode: bot plays right after the human passes", async () => {
  // human: 6 then hold. bot (easy): 6, 6 -> 12 -> hold.
  const h = makeHandlers(makeFakeDb(), { rng: fixedDice(6, 6, 6) });
  const id = (await start(h, { mode: "bot", botLevel: "easy", players: [players[0]] })).body.game.id;
  await call(h.roll, { method: "POST", query: { id } });
  const r = await call(h.hold, { method: "POST", query: { id } });
  assert.equal(r.body.game.players[1].isBot, true);
  assert.equal(r.body.game.players[1].total, 12);
  assert.equal(r.body.game.currentPlayer, 0);
  assert.ok(r.body.events.some((e) => e.player === 1));
});

test("finishing a game records exactly one result, leaderboard and history use it", async () => {
  const db = makeFakeDb();
  const h = makeHandlers(db, { rng: fixedDice(6) });
  const id = (await start(h, { maxPoints: 25 })).body.game.id;
  let last;
  for (let i = 0; i < 5; i++) last = await call(h.roll, { method: "POST", query: { id } });
  assert.equal(last.body.game.status, "finished");
  assert.equal(last.body.game.winner, 0);
  assert.equal(db.results.length, 1);

  // Game is over: more moves rejected, no duplicate result.
  assert.equal((await call(h.roll, { method: "POST", query: { id } })).status, 409);
  assert.equal(db.results.length, 1);

  const lb = await call(h.leaderboard, { query: {} });
  assert.deepEqual(lb.body.leaderboard.map((r) => [r.name, r.wins, r.played]), [["Ann", 1, 1], ["Bob", 0, 1]]);

  const hist = await call(h.history, { query: { name: "ann" } });
  assert.equal(hist.body.matches.length, 1);
  assert.equal(hist.body.stats.winRate, 100);
  assert.equal(hist.body.matches[0].winner, "Ann");
});

test("two requests at once cannot both apply (optimistic lock)", async () => {
  const db = makeFakeDb();
  const h = makeHandlers(db, { rng: fixedDice(3) });
  const id = (await start(h)).body.game.id;
  const [a, b] = await Promise.all([
    call(h.roll, { method: "POST", query: { id } }),
    call(h.roll, { method: "POST", query: { id } }),
  ]);
  const statuses = [a.status, b.status].sort();
  assert.ok(statuses.includes(200));
  const saved = await db.getGame(id);
  assert.ok(saved.players[0].running === 3 || saved.players[0].running === 6);
});

test("query validation on leaderboard and history", async () => {
  const h = makeHandlers(makeFakeDb());
  assert.equal((await call(h.leaderboard, { query: { limit: "9999" } })).status, 400);
  assert.equal((await call(h.history, { query: { limit: "abc" } })).status, 400);
});
