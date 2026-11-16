import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "src/components/Navbar";
import { getHistory, getLeaderboard } from "src/api/client";

function useLoad(loader, deps = []) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    loader()
      .then((data) => !cancelled && setState({ loading: false, error: "", data }))
      .catch((e) => !cancelled && setState({ loading: false, error: e.message, data: null }));
    return () => {
      cancelled = true;
    };
  }, [...deps, attempt]);
  return { ...state, retry: () => setAttempt((a) => a + 1) };
}

function Status({ loading, error, retry, empty, emptyText }) {
  if (loading) return <p className="text-center py-8" role="status">Loading…</p>;
  if (error)
    return (
      <div role="alert" className="text-center py-6 flex flex-col items-center gap-3">
        <p>{error}</p>
        <button onClick={retry} className="px-5 py-2 rounded bg-[#D30CBD] font-bold">
          Try again
        </button>
      </div>
    );
  if (empty) return <p className="text-center py-8 text-[#ffffffb0]">{emptyText}</p>;
  return null;
}

const medal = ["🥇", "🥈", "🥉"];
const when = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) +
  " " +
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function MatchList({ matches }) {
  return (
    <ul className="flex flex-col gap-2">
      {matches.map((m) => (
        <li
          key={m.id}
          className="bg-[#ffffff10] border border-[#ffffff40] rounded-lg p-3 flex flex-wrap justify-between gap-2"
        >
          <span>
            <b>{m.winner}</b> won {m.mode === "bot" ? `vs Computer (${m.botLevel})` : "a friends game"}
          </span>
          <span className="text-sm text-[#ffffffb0]">
            to {m.maxPoints} · {m.rolls} rolls · {when(m.when)}
          </span>
          <span className="w-full text-sm text-[#ffffffb0]">
            {m.players.map((p) => `${p.name} ${p.total}`).join(" · ")}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Leaderboard() {
  const [tab, setTab] = useState("top");
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState("");

  const top = useLoad(() => getLeaderboard(10));
  const recent = useLoad(() => getHistory({ limit: 10 }));
  const person = useLoad(() => (lookup ? getHistory({ name: lookup, limit: 10 }) : Promise.resolve(null)), [lookup]);

  const tabs = [
    ["top", "Top players"],
    ["recent", "Recent matches"],
    ["me", "My stats"],
  ];

  return (
    <>
      <Navbar />
      <main className="text-white px-[5%] md:px-[15%] py-6 flex flex-col gap-6">
        <h1 className="pri-font text-3xl md:text-5xl text-center">Leaderboard</h1>

        <div role="tablist" aria-label="Leaderboard views" className="flex justify-center gap-2 flex-wrap">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg border-2 ${
                tab === id ? "bg-[#D30CBD] border-white font-bold" : "bg-[#ffffff10] border-[#ffffff40]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "top" && (
          <section aria-label="Top players">
            <Status {...top} empty={top.data && top.data.leaderboard.length === 0} emptyText="No games finished yet. Be the first on the board!" />
            {top.data && top.data.leaderboard.length > 0 && (
              <ol className="flex flex-col gap-2">
                {top.data.leaderboard.map((r) => (
                  <li
                    key={r.name}
                    className="bg-[#ffffff10] border border-[#ffffff40] rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 text-center text-xl">{medal[r.rank - 1] ?? r.rank}</span>
                      <b className="text-lg">{r.name}</b>
                    </span>
                    <span className="text-sm text-right">
                      {r.wins} win{r.wins === 1 ? "" : "s"} · {r.played} played · {r.winRate}%
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {tab === "recent" && (
          <section aria-label="Recent matches">
            <Status {...recent} empty={recent.data && recent.data.matches.length === 0} emptyText="No matches yet." />
            {recent.data && <MatchList matches={recent.data.matches} />}
          </section>
        )}

        {tab === "me" && (
          <section aria-label="My stats" className="flex flex-col gap-4">
            <form
              className="flex gap-2 justify-center flex-wrap"
              onSubmit={(e) => {
                e.preventDefault();
                setLookup(query.trim());
              }}
            >
              <label htmlFor="who" className="sr-only">Player name</label>
              <input
                id="who"
                value={query}
                maxLength={20}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type your player name"
                className="p-2 bg-[#ffffff20] border rounded-md w-[250px]"
              />
              <button className="px-5 py-2 rounded bg-[#D30CBD] font-bold" disabled={!query.trim()}>
                Look up
              </button>
            </form>
            {lookup && (
              <>
                <Status {...person} empty={person.data && person.data.matches.length === 0} emptyText={`No finished games found for "${lookup}".`} />
                {person.data?.stats && person.data.matches.length > 0 && (
                  <>
                    <p className="text-center text-lg">
                      <b>{person.data.stats.name}</b>: {person.data.stats.wins} wins from {person.data.stats.played} games ({person.data.stats.winRate}% win rate)
                    </p>
                    <MatchList matches={person.data.matches} />
                  </>
                )}
              </>
            )}
          </section>
        )}

        <Link to="/" className="text-center underline">Back to home</Link>
      </main>
    </>
  );
}
