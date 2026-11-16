// In-memory stand-in for api/_lib/db.js, used only by the tests.
export function makeFakeDb() {
  const games = new Map();
  const results = [];
  return {
    games,
    results,
    async insertGame(state) { games.set(state.id, structuredClone(state)); },
    async getGame(id) { return games.has(id) ? structuredClone(games.get(id)) : null; },
    async saveGame(state, expectedVersion) {
      const current = games.get(state.id);
      if (!current || current.version !== expectedVersion) return false;
      games.set(state.id, structuredClone(state));
      return true;
    },
    async insertResult(r) {
      if (results.some((x) => x.game_id === r.game_id)) return;
      results.unshift({ id: results.length + 1, created_at: new Date().toISOString(), ...r });
    },
    async recentResults({ limit, name }) {
      return results
        .filter((r) => !name || r.player_names.includes(name.toLowerCase()))
        .slice(0, limit);
    },
  };
}

// Tiny fake of Vercel's req/res.
export function call(handler, { method = "GET", body, query = {} } = {}) {
  return new Promise((resolve) => {
    const res = {
      headers: {},
      statusCode: 200,
      setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); },
    };
    handler({ method, body, query }, res);
  });
}

// A die that returns a fixed sequence, then keeps repeating the last value.
export function fixedDice(...values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
