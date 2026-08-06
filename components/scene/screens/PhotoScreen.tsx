"use client";
import { useState } from "react";
import { ScreenShell } from "./ScreenShell";

/**
*  —          .
*   (loupe)      .
* 👉     . onClose =  .
 *
*  : public/    PHOTO_SRC   .
 */
const PHOTO_SRC = "/picture_v1_cdither_g2_l4.jpg";
const LENS = 160; // (px)
const ZOOM = 1.5; //

export function PhotoScreen({ onClose }: { onClose: () => void }) {
  const [lens, setLens] = useState<{
    x: number;
    y: number;
    bgSize: string;
    bgPos: string;
  } | null>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLens({
      x,
      y,
      bgSize: `${rect.width * ZOOM}px ${rect.height * ZOOM}px`,
      //
      bgPos: `${-(x * ZOOM - LENS / 2)}px ${-(y * ZOOM - LENS / 2)}px`,
    });
  }

  return (
    <ScreenShell title="Photo" onClose={onClose}>
      {/* info info info — info info info info info */}
      <figure className="w-[min(94vw,840px)] overflow-hidden rounded-[4px] border-[3px] border-cream shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]">
        <div
          className="relative leading-none [&:hover>img]:cursor-none"
          onMouseMove={handleMove}
          onMouseLeave={() => setLens(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PHOTO_SRC} alt="A framed photo" draggable={false} className="block w-full select-none" />

          {/* info info */}
          {lens && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-full border-2 border-cream shadow-[0_6px_20px_rgba(0,0,0,0.55)]"
              style={{
                width: LENS,
                height: LENS,
                left: lens.x - LENS / 2,
                top: lens.y - LENS / 2,
                backgroundImage: `url(${PHOTO_SRC})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: lens.bgSize,
                backgroundPosition: lens.bgPos,
              }}
            />
          )}
        </div>
      </figure>
    </ScreenShell>
  );
}
