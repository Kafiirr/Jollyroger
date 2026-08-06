"use client";
import { useEffect } from "react";

/**  /   (  )  Escape   .
*       Esc    . */
const closeStack: (() => void)[] = [];
let listening = false;

function ensureListener() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || closeStack.length === 0) return;
    closeStack[closeStack.length - 1]();
  });
}

/** active true  onClose Escape  . */
export function useEscapeToClose(onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    ensureListener();
    closeStack.push(onClose);
    return () => {
      const i = closeStack.lastIndexOf(onClose);
      if (i !== -1) closeStack.splice(i, 1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
