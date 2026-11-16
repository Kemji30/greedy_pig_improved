// Runs the /api routes locally (port 3001) so you can develop without Vercel.
// Start it with `npm run dev:api` in one terminal and `npm run dev` in another.
import http from "node:http";
import { handlers } from "../api/_lib/index.js";

const routes = [
  [/^\/api\/games$/, handlers.createGame, []],
  [/^\/api\/games\/([^/]+)\/roll$/, handlers.roll, ["id"]],
  [/^\/api\/games\/([^/]+)\/hold$/, handlers.hold, ["id"]],
  [/^\/api\/games\/([^/]+)$/, handlers.getGame, ["id"]],
  [/^\/api\/leaderboard$/, handlers.leaderboard, []],
  [/^\/api\/history$/, handlers.history, []],
];

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    for (const [pattern, handler, names] of routes) {
      const match = url.pathname.match(pattern);
      if (!match) continue;
      const query = Object.fromEntries(url.searchParams);
      names.forEach((n, i) => (query[n] = match[i + 1]));
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        let body;
        try {
          body = raw ? JSON.parse(raw) : undefined;
        } catch {
          body = raw; // handlers report invalid JSON themselves
        }
        handler(
          { method: req.method, query, body },
          {
            setHeader: (k, v) => res.setHeader(k, v),
            status(code) { res.statusCode = code; return this; },
            json(payload) {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(payload));
            },
          }
        );
      });
      return;
    }
    res.statusCode = 404;
    res.end("Not found");
  })
  .listen(3001, () => console.log("API running on http://localhost:3001"));
