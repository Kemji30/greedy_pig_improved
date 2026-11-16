import React from "react";
import { useLiveGameContext } from "src/context/useLiveGameContext";
import Menu from "./Menu";
import { Dice } from "src/components/Dice";

function DiceSection() {
  const { gamePlayers, maxPoints, pass, canPass, openTutorial } = useLiveGameContext();

  return (
    <div className="h-screen border-r-[#ffffff40] border-r hidden md:flex flex-col items-center justify-around p-8 sticky top-0 bg-[#00000010] ">
      <Dice />
      <div className="w-full flex flex-col gap-2">
        <button
          className="bg-[#056FA4c0] w-full text-white text-center text-base lg:text-xl xl:text-2xl font-semibold py-2 lg:py-4 rounded-lg border hover:scale-105 active:scale-100 duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          onClick={pass}
          disabled={!canPass}
          aria-keyshortcuts="H"
        >
          PASS
        </button>
        <p className="text-center text-xs text-[#ffffffa0]">
          Keys: <kbd className="border px-1 rounded">R</kbd> roll ·{" "}
          <kbd className="border px-1 rounded">H</kbd> pass
        </p>
      </div>
      <div className="text-white grid place-content-center gap-2 bg-[#ffffff10] w-full p-4 rounded-lg border border-[#ffffff40]">
        <p className="text-center text-sm lg:text-lg">{gamePlayers.length} players</p>
        <p className="text-center text-sm  lg:text-lg">{maxPoints} max points</p>
        <button
          onClick={openTutorial}
          className="text-xs underline text-[#ffffffc0] hover:text-white"
        >
          Show tutorial (?)
        </button>
      </div>
      <Menu />
    </div>
  );
}

export default DiceSection;
