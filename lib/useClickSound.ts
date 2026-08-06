"use client";
import { useCallback, useEffect, useRef } from "react";

// — AudioContext  +   ( 1 )
let sharedCtx: AudioContext | null = null;
const bufferCache = new Map<string, Promise<AudioBuffer>>();

function getContext() {
  if (!sharedCtx) sharedCtx = new AudioContext();
  return sharedCtx;
}

function loadBuffer(ctx: AudioContext, src: string) {
  let promise = bufferCache.get(src);
  if (!promise) {
    promise = fetch(src)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data));
    bufferCache.set(src, promise);
  }
  return promise;
}

/**     — Web Audio API     seek/    . */
export function useClickSound(src: string, volume = 0.5) {
  const bufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadBuffer(getContext(), src)
      .then((buffer) => {
        if (!cancelled) bufferRef.current = buffer;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  return useCallback(() => {
    const buffer = bufferRef.current;
    if (!buffer) return;
    const ctx = getContext();
    if (ctx.state === "suspended") ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start(0);
  }, [volume]);
}
