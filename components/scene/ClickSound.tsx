"use client";
import { useEffect } from "react";
import { useClickSound } from "@/lib/useClickSound";

/**
*   —     (···· )
*  UI  .     window    .
*   pointerdown( ) — click( )    .
*  Scene  .
 */
export function ClickSound() {
  const play = useClickSound("/sounds/ui-click.mp3");

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (e.button !== 0) return; // (/)
      const target = e.target as HTMLElement | null;
      // —  ·
      const el = target?.closest(
        'button, a[href], [role="button"], [role="option"], summary'
      ) as HTMLElement | null;
      if (!el) return;
      if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;
      play();
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, [play]);

  return null;
}
