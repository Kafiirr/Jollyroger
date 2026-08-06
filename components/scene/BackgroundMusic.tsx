"use client";
import { useEffect, useRef, useState } from "react";
import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";

const TARGET_VOLUME = 0.35;
const FADE_IN_MS = 2500;

/**       —        .    . */
export function BackgroundMusic({ active }: { active: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  // (  BGM  )
  const [suppressed, setSuppressed] = useState(false);

  useEffect(() => {
    const onSuppress = (e: Event) => setSuppressed((e as CustomEvent<boolean>).detail);
    window.addEventListener("suppress-room-bgm", onSuppress);
    return () => window.removeEventListener("suppress-room-bgm", onSuppress);
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/bgm.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0;
    }
    audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (active && !suppressed) {
      audio.volume = 0;
      // ,  ()
      audio.play().catch(() => {
        const retry = () => audio.play().catch(() => {});
        document.addEventListener("pointerdown", retry, { once: true });
      });
      const start = performance.now();
      let raf = requestAnimationFrame(function fade(now) {
        // rAF   now start    (  ) 0    clamp
        const t = Math.max(0, Math.min((now - start) / FADE_IN_MS, 1));
        audio.volume = t * TARGET_VOLUME;
        if (t < 1) raf = requestAnimationFrame(fade);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [active, suppressed]);

  if (!active) return null;

  return (
    <button
      type="button"
      onClick={() => setMuted((m) => !m)}
      aria-label={muted ? "Unmute background music" : "Mute background music"}
      className="absolute right-3 bottom-3 sm:right-5 sm:bottom-5 z-30 grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-full bg-glass border border-glassline text-creamdim hover:text-cream transition-colors"
    >
      {muted ? (
        <SpeakerSlash className="w-3.5 h-3.5 sm:w-4 sm:h-4" weight="bold" aria-hidden />
      ) : (
        <SpeakerHigh className="w-3.5 h-3.5 sm:w-4 sm:h-4" weight="bold" aria-hidden />
      )}
    </button>
  );
}
