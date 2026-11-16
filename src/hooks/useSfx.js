import { useCallback, useRef } from "react";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import rollSrc from "src/sound_effect/dice_roll.mp3";
import loseSrc from "src/sound_effect/lose_sound.mp3";
import passSrc from "src/sound_effect/add_player.mp3";
import winSrc from "src/sound_effect/celebration.mp3";

// One set of audio objects for the whole game, created once.
export default function useSfx() {
  const { hasSound } = useGreedyPigContext();
  const soundOn = useRef(hasSound);
  soundOn.current = hasSound;
  const audio = useRef(null);
  if (!audio.current) {
    audio.current = {
      roll: new Audio(rollSrc),
      lose: new Audio(loseSrc),
      pass: new Audio(passSrc),
      win: new Audio(winSrc),
    };
  }
  return useCallback((name) => {
    if (!soundOn.current) return;
    try {
      const a = audio.current[name];
      a.currentTime = 0;
      a.play()?.catch(() => {});
    } catch {
      /* autoplay blocked: ignore */
    }
  }, []);
}
