"use client";
import type { RefObject } from "react";
import { quadMatrix3d, type Corners } from "@/lib/quad";
import { useElementSize } from "@/lib/useElementSize";

const BASE = 100; // (px) — matrix3d corners

/**
*      (:   )  (corners)   .
*     ·     .
*     (--) .
 */
export function OverlayQuad({
  src,
  corners,
  sceneRef,
  className = "",
  hovered = false,
}: {
  src: string;
  corners: Corners;
  sceneRef: RefObject<HTMLDivElement | null>;
  className?: string;
/**      (pop) */
  hovered?: boolean;
}) {
  const { width, height } = useElementSize(sceneRef);
  if (!width || !height) return null;
  const matrix = quadMatrix3d(corners, width, height, BASE);
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: BASE,
        height: BASE,
        transformOrigin: "0 0",
        transform: matrix,
      }}
      className={`pointer-events-none select-none ${className}`}
    >
      {/* info info info info 5% info — matrixinfo info info info info */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        className={`block w-full h-full select-none origin-center transition-transform duration-200 motion-reduce:transition-none ${
          hovered ? "scale-[1.05]" : "scale-100"
        }`}
      />
    </div>
  );
}
