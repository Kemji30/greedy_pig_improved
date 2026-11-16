import React, { useEffect, useRef, useState } from "react";
import { useLiveGameContext } from "src/context/useLiveGameContext";

// A short step-by-step walkthrough shown the first time someone opens the game.
export default function Tutorial() {
  const { closeTutorial, maxPoints, gameMode } = useLiveGameContext();
  const [step, setStep] = useState(0);
  const nextRef = useRef(null);
  const dialogRef = useRef(null);

  const steps = [
    {
      title: "Roll the dice",
      text: "On your turn, press the big dice (or the R key) to roll. Every roll adds to your turn total.",
      icon: "🎲",
    },
    {
      title: "Don't roll a 1!",
      text: "If you roll a 1 you lose your turn total and the next player goes. Greedy players get caught.",
      icon: "💥",
    },
    {
      title: "Pass to keep your points",
      text: "Press PASS (or the H key) to bank your turn total. You must roll at least once before you can pass.",
      icon: "🐷",
    },
    {
      title: `Be first to ${maxPoints}`,
      text:
        gameMode === "bot"
          ? "The computer plays right after you. Watch its rolls, it gets braver on Hard!"
          : "Pass the device to the next player after each turn. First to the target score wins.",
      icon: "🏆",
    },
  ];
  const last = step === steps.length - 1;

  useEffect(() => {
    nextRef.current?.focus();
  }, [step]);

  // Keep keyboard focus inside the dialog.
  function onKeyDown(e) {
    if (e.key !== "Tab") return;
    const items = dialogRef.current.querySelectorAll("button");
    const first = items[0];
    const lastItem = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      lastItem.focus();
    } else if (!e.shiftKey && document.activeElement === lastItem) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#000000b0] flex items-center justify-center p-4"
      onKeyDown={onKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        className="bg-[#1c1c1c] text-white border border-[#ffffff40] rounded-xl p-6 w-full max-w-md flex flex-col gap-4"
      >
        <p className="text-sm text-[#ffffffa0]" aria-live="polite">
          Step {step + 1} of {steps.length}
        </p>
        <div className="text-5xl text-center" aria-hidden="true">
          {steps[step].icon}
        </div>
        <h2 id="tutorial-title" className="pri-font text-2xl text-center">
          {steps[step].title}
        </h2>
        <p className="text-center text-lg">{steps[step].text}</p>
        <div className="flex justify-between gap-2 mt-2">
          <button
            onClick={closeTutorial}
            className="px-3 py-2 text-sm underline text-[#ffffffc0] hover:text-white"
          >
            Skip
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="px-4 py-2 rounded border border-[#ffffff60] disabled:opacity-30"
            >
              Back
            </button>
            <button
              ref={nextRef}
              onClick={() => (last ? closeTutorial() : setStep((s) => s + 1))}
              className="px-4 py-2 rounded bg-[#D30CBD] font-bold"
            >
              {last ? "Let's play" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
