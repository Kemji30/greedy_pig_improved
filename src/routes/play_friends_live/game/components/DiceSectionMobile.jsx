import React from "react";
import { useLiveGameContext } from "src/context/useLiveGameContext";
import Menu from "./Menu";
import { Dice } from "src/components/Dice";

function DiceSectionMobile() {
  const { gamePlayers, maxPoints, pass, canPass, openTutorial } = useLiveGameContext();

  return (
    <div className=" border-r-[#ffffff40] border-r md:hidden flex flex-col items-center justify-around px-2 bg-[#00000010] h-[60vh] ">
      <button
        className="bg-[#056FA480] w-[200px] text-white text-center text-base font-semibold py-2 rounded border hover:scale-105 active:scale-100 duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={pass}
        disabled={!canPass}
      >
        PASS
      </button>

      <Dice />

      <Menu />
      <div className="text-white flex justify-between items-center w-full">
        <p className="text-center text-sm">{gamePlayers.length} players</p>
        <button onClick={openTutorial} className="text-xs underline">
          Tutorial
        </button>
        <p className="text-center text-sm">{maxPoints} max points</p>
      </div>
    </div>
  );
}

export default DiceSectionMobile;
