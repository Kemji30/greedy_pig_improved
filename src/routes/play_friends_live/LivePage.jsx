import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { LiveGameContext } from "src/context/useLiveGameContext";
import { getInitialPlayerData } from "src/utils/live_game/getInitialData";
import useServerGame from "src/hooks/useServerGame";

const TUTORIAL_KEY = "greedy_pig_tutorial_seen_v1";

function LiveGamePage() {
  const { preloadSrcList, pigPetNames } = useGreedyPigContext();
  // playerData = the players being set up. gamePlayers = the players in the running game.
  const [playerData, setPlayerData] = useState(
    getInitialPlayerData(preloadSrcList.slice(0, 9), pigPetNames)
  );
  const [gamePlayers, setGamePlayers] = useState([]);
  const [gameId, setGameId] = useState(null);
  const [gameMode, setGameMode] = useState("friends"); // "friends" | "bot"
  const [botLevel, setBotLevel] = useState("medium");
  const [maxPoints, setMaxPoints] = useState(100);
  const [changeBackground, setChangeBackground] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isContinue, setIsContinue] = useState(false);
  const [diceValue, setDiceValue] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  const game = useServerGame({
    gameId,
    gamePlayers,
    setGamePlayers,
    currentPlayer,
    setCurrentPlayer,
    isGameOver,
    setIsGameOver,
    setDiceValue,
    setChangeBackground,
  });

  const closeTutorial = () => {
    setShowTutorial(false);
    try {
      localStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
      /* private mode: the tutorial may show again, that is fine */
    }
  };

  return (
    <>
      <main className="bg-[#111111] min-h-screen min-w-full relative z-10 sec-font ">
        <div
          className={`${
            changeBackground ? " bg-[#D30CBD] blur-[200px] md:blur-[300px] " : diceValue === 1 ? "bg-[#D30C0C]  blur-[500px] md:blur-[800px]" : "bg-[#056FA4]  blur-[500px] md:blur-[800px]"
          } rounded-full w-[800px] h-[800px] -z-10 fixed -bottom-[700px] -left-[700px] md:-bottom-96 md:-left-96 `}
        ></div>
        <div className={`${
            changeBackground ? "bg-[#056FA4] blur-[200px] md:blur-[300px] " : diceValue === 1 ? "bg-[#D30C0C] blur-[500px] md:blur-[800px] " : "bg-[#D30CBD] blur-[500px] md:blur-[800px]"
          } rounded-full w-[800px] h-[800px]  -z-10 fixed -top-[700px] -right-[700px] md:-top-96 md:-right-96`}></div>
        <LiveGameContext.Provider
          value={{
            playerData,
            setPlayerData,
            gamePlayers,
            setGamePlayers,
            gameId,
            setGameId,
            gameMode,
            setGameMode,
            botLevel,
            setBotLevel,
            maxPoints,
            setMaxPoints,
            changeBackground,
            setChangeBackground,
            diceValue,
            setDiceValue,
            currentPlayer,
            setCurrentPlayer,
            setIsGameOver,
            isGameOver,
            isContinue,
            setIsContinue,
            showTutorial,
            openTutorial: () => setShowTutorial(true),
            closeTutorial,
            tutorialKey: TUTORIAL_KEY,
            ...game,
          }}
        >
          <Outlet />
        </LiveGameContext.Provider>
      </main>
    </>
  );
}

export default LiveGamePage;
