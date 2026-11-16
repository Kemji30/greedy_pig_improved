import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { useLiveGameContext } from "src/context/useLiveGameContext";

// Shows the die. The number itself always comes from the server (see useServerGame).
export function Dice() {
  const { preloadSrcList } = useGreedyPigContext();
  const { roll, canRoll, isRolling, diceFace } = useLiveGameContext();
  const die = preloadSrcList.filter((dice) => dice.includes("dice"));

  return (
    <button
      className="hover:scale-105 active:scale-100 duration-300 md:w-auto w-[200px] disabled:cursor-not-allowed disabled:hover:scale-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white rounded-xl"
      onClick={roll}
      disabled={!canRoll}
      aria-label={isRolling ? "Rolling the dice" : "Roll the dice"}
    >
      {die.map((dice, index) => (
        <img
          key={index}
          src={dice}
          alt=""
          className={`${diceFace === index ? "" : "hidden"} ${isRolling ? "animate-pulse" : ""}`}
        />
      ))}
    </button>
  );
}
