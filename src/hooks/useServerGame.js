import { useCallback, useRef, useState } from "react";
import { holdPoints, rollDice } from "src/api/client";
import useSfx from "./useSfx";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nameOf = (p) => (p.name === "" ? p.tag : p.name);

// The game now lives on the server. This hook asks the server to roll or pass,
// then plays the answer (including the computer's turns) on screen.
export default function useServerGame({
  gameId,
  gamePlayers,
  setGamePlayers,
  currentPlayer,
  setCurrentPlayer,
  isGameOver,
  setIsGameOver,
  setDiceValue,
  setChangeBackground,
}) {
  const play = useSfx();
  const [isRolling, setIsRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [diceFace, setDiceFace] = useState(0);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const lock = useRef(false);

  // Always-fresh copies for use inside async code.
  const live = useRef({});
  live.current = { gamePlayers, currentPlayer, isGameOver, gameId };

  const say = useCallback((text) => setAnnouncement(text), []);

  // Shows what happened, one event at a time, then syncs to the server's numbers.
  async function playEvents(events, game) {
    const players = live.current.gamePlayers;
    const n = players.length;
    const sim = players.map((p) => ({ total: p.total_points, running: p.running_points }));

    const show = (cp) => {
      const snap = sim.map((s) => ({ ...s }));
      setGamePlayers((prev) =>
        prev.map((p, i) => ({ ...p, total_points: snap[i].total, running_points: snap[i].running }))
      );
      setCurrentPlayer(cp);
    };

    for (const e of events) {
      const who = players[e.player];
      const name = nameOf(who);
      if (who.isBot) await sleep(900); // lets people watch the computer play

      if (e.type === "roll") {
        sim[e.player].running += e.value;
        setDiceFace(e.value - 1);
        setDiceValue(e.value);
        if (who.isBot) play("roll");
        say(`${name} rolled a ${e.value}. Turn total ${sim[e.player].running}.`);
        show(e.player);
      } else if (e.type === "bust") {
        sim[e.player].running = 0;
        setDiceFace(0);
        setDiceValue(1);
        play("lose");
        const next = (e.player + 1) % n;
        say(`${name} rolled a 1 and lost the turn points. It is ${nameOf(players[next])}'s turn.`);
        show(next);
      } else if (e.type === "hold") {
        sim[e.player].total += e.banked;
        sim[e.player].running = 0;
        setDiceValue(0);
        play("pass");
        const next = (e.player + 1) % n;
        say(`${name} passed and banked ${e.banked} points, total ${sim[e.player].total}. It is ${nameOf(players[next])}'s turn.`);
        show(next);
      } else if (e.type === "win") {
        sim[e.player].total += sim[e.player].running;
        sim[e.player].running = 0;
        say(`${name} wins with ${sim[e.player].total} points!`);
        show(e.player);
        await sleep(1000);
        play("win");
        setIsGameOver(true);
      }
    }

    // The server's numbers are the truth.
    setGamePlayers((prev) =>
      prev.map((p, i) => ({
        ...p,
        total_points: game.players[i].total,
        running_points: game.players[i].running,
      }))
    );
    setCurrentPlayer(game.currentPlayer);
  }

  const currentIsBot = !!gamePlayers[currentPlayer]?.isBot;
  const canRoll = !!gameId && !isGameOver && !busy && !currentIsBot;
  const canPass = canRoll && (gamePlayers[currentPlayer]?.running_points ?? 0) > 0;

  const roll = useCallback(async () => {
    const { gamePlayers: gp, currentPlayer: cp, isGameOver: over, gameId: id } = live.current;
    if (lock.current || !id || over || gp[cp]?.isBot) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setIsRolling(true);
    setChangeBackground(true);

    const startedAt = Date.now();
    const ticker = setInterval(() => {
      play("roll");
      setDiceFace(Math.floor(Math.random() * 6));
    }, 100);

    let result = null;
    try {
      result = await rollDice(id);
    } catch (e) {
      setError(e.message);
    }
    await sleep(Math.max(0, 1200 - (Date.now() - startedAt)));
    clearInterval(ticker);
    setChangeBackground(false);
    setIsRolling(false);

    try {
      if (result) await playEvents(result.events, result.game);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);

  const pass = useCallback(async () => {
    const { gamePlayers: gp, currentPlayer: cp, isGameOver: over, gameId: id } = live.current;
    if (lock.current || !id || over || gp[cp]?.isBot || gp[cp]?.running_points === 0) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await holdPoints(id);
      await playEvents(result.events, result.game);
      document
        .getElementById(String(result.game.currentPlayer))
        ?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);

  return {
    roll,
    pass,
    canRoll,
    canPass,
    isRolling,
    busy,
    diceFace,
    error,
    clearError: () => setError(""),
    announcement,
  };
}
