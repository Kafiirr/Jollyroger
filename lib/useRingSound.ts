"use client";
import { useEffect, useRef } from "react";

// (.animate-ring, app/globals.css)    .
// ring-shake : 0~45%( 0.99s)   ,  55%  —      .
const RING_VISUAL_DELAY_MS = 1200; // —
const CYCLE_MS = 2200; // ring-shake
const BUZZ_MS = CYCLE_MS * 0.45; // (0~45%)

/**   —       ,    .    . */
export function useRingSound(src: string, active: boolean, volume = 0.5) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.volume = volume;
    }
    const audio = audioRef.current;

    if (!active) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    // () → () →  ,
    const scheduleBuzz = (delay: number) => {
      timers.push(
        setTimeout(() => {
          audio.currentTime = 0;
          audio.play().catch(() => {});
          timers.push(
            setTimeout(() => {
              audio.pause();
              scheduleBuzz(CYCLE_MS - BUZZ_MS);
            }, BUZZ_MS)
          );
        }, delay)
      );
    };
    scheduleBuzz(RING_VISUAL_DELAY_MS);

    return () => {
      timers.forEach(clearTimeout);
      audio.pause();
    };
  }, [active, src, volume]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);
}
