import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "src/components/Navbar";
import Tutorial from "src/components/Tutorial";
import { useLiveGameContext } from "src/context/useLiveGameContext";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import PlayerTable from "./components/PlayerTable";
import StatsSection from "./components/StatsSection";
import GameOver from "./GameOver";
import DiceSection from "./components/DiceSection";
import StatsSectionMobile from "./components/StatsSectionMobile";
import CurrentPlayerMobile from "./components/CurrentPlayerMobile";
import DiceSectionMobile from "./components/DiceSectionMobile";

export default function LiveGame() {
  const {
    gamePlayers,
    currentPlayer,
    isGameOver,
    setIsContinue,
    gameId,
    roll,
    pass,
    error,
    clearError,
    announcement,
    showTutorial,
    openTutorial,
    closeTutorial,
    tutorialKey,
    busy,
  } = useLiveGameContext();
  const { setHasSound } = useGreedyPigContext();

  useEffect(() => {
    setIsContinue(true);
  }, []);

  // First visit: show the tutorial.
  useEffect(() => {
    try {
      if (!localStorage.getItem(tutorialKey)) openTutorial();
    } catch {
      openTutorial();
    }
  }, []);

  // Keyboard controls: R roll, H or P pass, M mute, ? help, Esc close help.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      if (showTutorial) {
        if (e.key === "Escape") closeTutorial();
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "r") {
        e.preventDefault();
        roll();
      } else if (key === "h" || key === "p") {
        e.preventDefault();
        pass();
      } else if (key === "m") {
        setHasSound((on) => !on);
      } else if (e.key === "?") {
        openTutorial();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [roll, pass, showTutorial]);

  // Refreshing the page loses the local game, so go back to setup.
  if (!gameId || gamePlayers.length === 0) {
    return <Navigate to="/live-game/setup" replace />;
  }

  return (
    <div className="md:grid md:grid-cols-[minmax(auto,_200px)_1fr_minmax(auto,_200px)] lg:grid-cols-[minmax(auto,_250px)_1fr_minmax(auto,_250px)] xl:grid-cols-[auto_1fr_minmax(auto,_300px)] relative">
      {/* Read out by screen readers after every move */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {error && (
        <div
          role="alert"
          className="fixed top-2 left-1/2 -translate-x-1/2 z-40 max-w-[92vw] bg-[#7a1020] text-white border border-[#ff6b81] rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg"
        >
          <span>{error}</span>
          <button onClick={clearError} className="underline font-bold shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {busy && gamePlayers[currentPlayer]?.isBot && (
        <p className="fixed bottom-2 left-1/2 -translate-x-1/2 z-30 bg-[#000000a0] text-white px-4 py-2 rounded-full text-sm">
          Computer is playing…
        </p>
      )}

      <DiceSection />
      <div className=" space-y-2 p-2">
        <Navbar />
        <PlayerTable playerData={gamePlayers} currentPlayer={currentPlayer} />
      </div>
      <CurrentPlayerMobile playerData={gamePlayers} currentPlayer={currentPlayer} />
      <DiceSectionMobile />

      <StatsSection playerData={gamePlayers} currentPlayer={currentPlayer} />
      <StatsSectionMobile playerData={gamePlayers} currentPlayer={currentPlayer} />
      {isGameOver ? (
        <GameOver playerData={gamePlayers} currentPlayer={currentPlayer} setIsContinue={setIsContinue} />
      ) : (
        <></>
      )}
      {showTutorial && <Tutorial />}
    </div>
  );
}
