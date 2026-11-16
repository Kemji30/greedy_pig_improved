# Greedy Pig Reimagined

**Course:** CSC 419, Advances in Web, Mobile and Blockchain Development (Pan-Atlantic University)

| Member                | Matric number | Improvement                                        |
|                       |               |                                                    |
| Ezenwoko Kemji        | 23120112020   | Competition: leaderboard, match history and stats  |
| Onochie-Mordi Sigmund | 23120112045   | Computer opponent with Easy / Medium / Hard levels |
| Akinbobola Favour     | 22120812881   | Accessibility and experience: keyboard controls, screen-reader announcements, step-by-step tutorial |

- **Live URL:** https://greedy-pig-improved.vercel.app/
- **Base game:** https://github.com/Hemephelus/greed_pig (React + Vite + Tailwind, all game logic ran in the browser)

## The three improvements

### 1. Competition (leaderboard, history, stats)
Every finished game is saved to the database. The **Leaderboard** page has three views:
top players (wins, games played, win rate), recent matches, and "My stats" (type a name to see that
player's record and games). Matches against the computer count for the human players too.

### 2. Computer opponents
Choose **Play Computer** and a difficulty. The computer takes its turns on the server, and the
screen replays its rolls one by one.

| Level | Strategy |
|---|---|
| Easy | Passes once it has 10 points in a turn |
| Medium | Passes at 20 |
| Hard | Aims for 25, but keeps rolling (to 40) when an opponent is within 20 points of winning, and plays safe (15) when it leads by 25+ |

### 3. Accessibility and experience
- **Keyboard:** `R` roll, `H` or `P` pass, `M` sound on/off, `?` tutorial, `Esc` closes dialogs. All buttons are real buttons with visible focus.
- **Screen readers:** every move is announced in an `aria-live` region ("Ann rolled a 4. Turn total 9."), dialogs use `role="dialog"`, errors use `role="alert"`.
- **Tutorial:** a 4-step walkthrough opens the first time someone plays, and can be reopened any time.

## Backend

- **Database:** Supabase (Postgres). Tables `games` and `match_results` (see `supabase/schema.sql`).
- **API:** Vercel serverless functions in `/api`:

| Method and path | What it does |
|---|---|
| `POST /api/games` | Validates the setup and starts a game |
| `POST /api/games/:id/roll` | **The server rolls the die**, updates scores, plays any computer turns |
| `POST /api/games/:id/hold` | Banks the turn points, plays any computer turns |
| `GET /api/games/:id` | Current game state |
| `GET /api/leaderboard?limit=` | Top players |
| `GET /api/history?name=&limit=` | Recent matches and a player's stats |

- **Anti-cheat:** the browser never sends a dice value or a score. It only says "roll" or "pass". Dice use `crypto.randomInt` on the server, turn order and rules are enforced there, and a finished game rejects more moves.
- **Validation:** `zod` schemas check every request (names, score range, player counts, ids, query values). Wrong input gets a `400` with a readable message.
- **Safe updates:** each game has a `version`; two requests at the same moment cannot both apply (optimistic locking).

```
src/              React app (Vite + Tailwind)
api/_lib/         game rules, bot, validation, handlers, database layer
api/              the serverless routes
supabase/         schema.sql
tests/            node:test unit and API tests (no real database needed)
```

## Run it

You need Node 20+ and a free Supabase project.

1. `npm install`
2. In Supabase: **SQL Editor**, paste `supabase/schema.sql`, run it.
3. Copy `.env.example` to `.env` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Project Settings, API).
4. Two terminals:
   - `npm run dev:api` (the API on port 3001)
   - `npm run dev` (the app, which proxies `/api` to it)
5. `npm test` runs the tests. `npm run build` makes the production build.

## Deploy (Vercel)

1. Push the repo to GitHub, then **Add New Project** on vercel.com and import it (Vite is detected automatically).
2. Add the environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Deploy. Check `https://greedy-pig-improved.vercel.app/api/leaderboard` returns `{"leaderboard":[]}`.

`vercel.json` makes page refreshes on routes like `/leaderboard` work.

## User-friendliness
- A new player can press **Play Computer** or **Play Friends**, then **Start Game**, with default players ready.
- Works on phone and desktop (separate mobile layout for the game screen).
- Clear feedback: dice animation, sounds, the computer's moves replayed with its name, "Computer is playing…", a result-saved note.
- Errors never crash the page: network or server problems show a message with a retry (`Try again` or just press the button again).
