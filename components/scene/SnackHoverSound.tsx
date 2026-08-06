"use client";
import { useHoverSound } from "@/lib/useHoverSound";

/**
*    — snack         .
*  spots.ts snack (Hotspot) ,  Scene     .
 */
export function SnackHoverSound({ active }: { active: boolean }) {
  useHoverSound("/sounds/eating-chips.mp3", active, 0.35);
  return null;
}
