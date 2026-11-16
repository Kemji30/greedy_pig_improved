import { useEffect, useState } from "react";
import Navbar from "src/components/Navbar";
import { useLiveGameContext } from "src/context/useLiveGameContext";
import AddPlayerButton from "./components/AddPlayerButton";
import NameInput from "./components/NameInput";
import ImageSlider from "./components/ImageSlider";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getInitialPlayerData } from "src/utils/live_game/getInitialData";
import { generateId } from "src/utils/generateData";
import SoundSwitch from "src/components/SoundSwitch";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { createGame } from "src/api/client";

const LEVELS = [
  { value: "easy", label: "Easy", hint: "Banks early, plays it safe" },
  { value: "medium", label: "Medium", hint: "Balanced" },
  { value: "hard", label: "Hard", hint: "Adapts to the scoreboard" },
];

function LiveGameSetup() {
  const {
    playerData,
    maxPoints,
    setMaxPoints,
    setPlayerData,
    setGamePlayers,
    setGameId,
    gameId,
    gameMode,
    setGameMode,
    botLevel,
    setBotLevel,
    setDiceValue,
    setIsGameOver,
    setCurrentPlayer,
    isContinue,
  } = useLiveGameContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { preloadSrcList, pigPetNames } = useGreedyPigContext();
  const pigs = preloadSrcList.filter((pig) => pig.includes("pig"));
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // The home page can open this screen straight in computer mode.
  useEffect(() => {
    if (searchParams.get("mode") === "bot") chooseMode("bot");
  }, []);

  function chooseMode(mode) {
    setGameMode(mode);
    if (mode === "bot" && playerData.length > 7) setPlayerData(playerData.slice(0, 7));
    setStartError("");
  }

  async function startNewGame() {
    setStartError("");
    const points = Number(maxPoints);
    if (!Number.isInteger(points) || points < 25 || points > 500) {
      setStartError("Max score must be a whole number from 25 to 500.");
      return;
    }
    const minPlayers = gameMode === "bot" ? 1 : 2;
    if (playerData.length < minPlayers) {
      setStartError(`You need at least ${minPlayers} player${minPlayers > 1 ? "s" : ""}.`);
      return;
    }
    const names = playerData.map((p) => (p.name.trim() === "" ? p.tag : p.name.trim()));
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
      setStartError("Two players have the same name. Give each player a different name.");
      return;
    }

    setStarting(true);
    try {
      const { game } = await createGame({
        mode: gameMode,
        botLevel: gameMode === "bot" ? botLevel : undefined,
        maxPoints: points,
        players: playerData.map((p, i) => ({ name: names[i], avatar: p.pig_index })),
      });

      const humans = playerData.map((p, i) => ({
        ...p,
        name: names[i],
        running_points: 0,
        total_points: 0,
      }));
      const bot = {
        id: generateId(),
        avatar: pigs[pigs.length - 1],
        tag: `Computer (${botLevel})`,
        name: "",
        pig_index: pigs.length - 1,
        running_points: 0,
        total_points: 0,
        isBot: true,
      };
      setGamePlayers(gameMode === "bot" ? [...humans, bot] : humans);
      setGameId(game.id);
      setMaxPoints(points);
      setDiceValue(0);
      setIsGameOver(false);
      setCurrentPlayer(0);
      navigate("/live-game/game");
    } catch (e) {
      setStartError(e.message);
    } finally {
      setStarting(false);
    }
  }

  function clearsPlayers() {
    setPlayerData(getInitialPlayerData(pigs, pigPetNames));
  }

  const startLabel = starting ? "Starting…" : isContinue ? "Start New Game" : "Start Game";

  return (
    <>
      <main className="">
        <Navbar />
        <div className="flex flex-col items-center gap-8 text-white px-[5%] md:px-[10%] py-4 ">
          <fieldset className="flex flex-col items-center gap-3">
            <legend className="text-center font-bold mb-2">Who are you playing?</legend>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { value: "friends", label: "With friends" },
                { value: "bot", label: "Against the computer" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`cursor-pointer px-5 py-3 rounded-lg border-2 duration-300 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-white ${
                    gameMode === opt.value
                      ? "bg-[#D30CBD] border-white font-bold"
                      : "bg-[#ffffff10] border-[#ffffff40] hover:border-[#ffffff90]"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={opt.value}
                    checked={gameMode === opt.value}
                    onChange={() => chooseMode(opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {gameMode === "bot" && (
            <fieldset className="flex flex-col items-center gap-3">
              <legend className="text-center font-bold mb-2">Computer difficulty</legend>
              <div className="flex flex-wrap justify-center gap-3">
                {LEVELS.map((lvl) => (
                  <label
                    key={lvl.value}
                    className={`cursor-pointer px-4 py-2 rounded-lg border-2 text-center duration-300 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-white ${
                      botLevel === lvl.value
                        ? "bg-[#056FA4] border-white font-bold"
                        : "bg-[#ffffff10] border-[#ffffff40] hover:border-[#ffffff90]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="level"
                      value={lvl.value}
                      checked={botLevel === lvl.value}
                      onChange={() => setBotLevel(lvl.value)}
                      className="sr-only"
                    />
                    <span className="block">{lvl.label}</span>
                    <span className="block text-xs text-[#ffffffb0]">{lvl.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <section className="flex flex-col">
            <label htmlFor="max-score">Max Score (25 to 500)</label>
            <input
              id="max-score"
              type="number"
              min={25}
              max={500}
              value={maxPoints}
              onChange={(e) => setMaxPoints(e.target.value)}
              className="p-2 bg-[#ffffff20] border rounded-md min-w-[5%] w-[250px]  "
              required
            />
          </section>

          <div className=" w-full  gap-2 flow-root">
            <section className="max-h-[350px] w-full overflow-y-auto bg-[#ffffff10] border rounded-lg p-4 grid grid-cols-fluid justify-center gap-4">
              {[...playerData].map((player, index) => (
                <div
                  key={player.id}
                  className=" flex flex-col w-full items-center  gap-2 p-2 rounded-lg border border-[#FFFFFF40] hover:border-[#ffffff80] duration-300"
                >
                  <NameInput player={player} index={index} />
                  <ImageSlider player={player} index={index} />
                </div>
              ))}

              <AddPlayerButton />
            </section>
            <button
              className="text-right text-xs p-2 bg-[#D30C0C40] text-[#ffffff] w-fit border border-[#D30C0C80] duration-300 hover:bg-[#D30C0C80]   hover:border-[#D30C0C] rounded float-right mt-2"
              onClick={clearsPlayers}
            >
              Clear Players
            </button>
            <SoundSwitch />
          </div>

          {startError && (
            <p role="alert" className="bg-[#7a1020] border border-[#ff6b81] rounded-lg px-4 py-3 max-w-md text-center">
              {startError}
            </p>
          )}

          <section className="flex gap-4 flex-wrap justify-center">
            <button
              onClick={startNewGame}
              disabled={starting}
              className="w-full md:w-fit sec-font text-xl rounded px-16 py-4 bg-[#D30CBD] font-bold  duration-500 skew-x-6 hover:skew-x-0 hover:scale-95 hover:bg-[#d30cbc] disabled:opacity-60"
            >
              {startLabel}
            </button>
            {isContinue && gameId && (
              <button
                onClick={() => navigate("/live-game/game")}
                className="w-full md:w-fit sec-font text-xl rounded px-16 py-4 bg-[#D30CBD] font-bold  duration-500 -skew-x-6 hover:skew-x-0 hover:scale-95 hover:bg-[#d30cbc] "
              >
                Resume Game
              </button>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

export default LiveGameSetup;
