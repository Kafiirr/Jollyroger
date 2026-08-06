"use client";
import { useHoverSound } from "@/lib/useHoverSound";

/**
* ()   — note         .
*  spots.ts note (Hotspot) ,  Scene     .
 */
export function NoteHoverSound({ active }: { active: boolean }) {
  // , 1(=100%)   (Web Audio GainNode 1  )
  useHoverSound("/sounds/writing-on-paper.mp3", active, 2.2);
  return null;
}
