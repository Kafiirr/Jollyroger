"use client";
import type { CSSProperties } from "react";
import { Spot, ROOM_IMG_BRIGHT, ROOM_IMG_NIGHT, ROOM_IMG_DARK } from "@/lib/spots";
import { useRingSound } from "@/lib/useRingSound";

interface Props {
  spot: Spot;
  disabled: boolean;
  pop?: boolean;
  night?: boolean;
  ring?: boolean;
  onHover?: (spot: Spot, hovering: boolean) => void;
  onSelect: (spot: Spot) => void;
}

export function Hotspot({
  spot,
  disabled,
  pop = false,
  ring = false,
  night = false,
  onHover,
  onSelect,
}: Props) {
  const { left, top, width, height } = spot.area;
  useRingSound("/sounds/phone-ring.mp3", ring);
  const clip = spot.clip;
  const clipPath = clip
    ? `polygon(${
        Array.isArray(clip)
          ? clip.map(([cx, cy]) => `${(((cx - left) / width) * 100).toFixed(2)}% ${(((cy - top) / height) * 100).toFixed(2)}%`).join(", ")
          : (["tl", "tr", "br", "bl"] as const)
              .map((k) => {
                const [cx, cy] = clip[k];
                return `${(((cx - left) / width) * 100).toFixed(2)}% ${(((cy - top) / height) * 100).toFixed(2)}%`;
              })
              .join(", ")
      })`
    : undefined;
  const popScale = spot.popScale ?? 1.05;

  const popImg = night ? ROOM_IMG_NIGHT : ROOM_IMG_BRIGHT;

  const glowClass = night
    ? "bg-[radial-gradient(ellipse_at_center,theme(colors.amber/18%),theme(colors.amber/6%)_42%,transparent_70%)]"
    : "bg-[radial-gradient(ellipse_at_center,theme(colors.cream/50%),theme(colors.cream/18%)_48%,transparent_78%)]";

  const maskClass = night
    ? "[mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_85%)]"
    : "[mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_90%)]";

  return (
    <button
      onClick={() => onSelect(spot)}
      onMouseEnter={() => onHover?.(spot, true)}
      onMouseLeave={() => onHover?.(spot, false)}
      disabled={disabled}
      aria-label={spot.label}
      style={
        {
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
          clipPath: ring ? undefined : clipPath,
          "--pop": popScale,
        } as CSSProperties
      }
      className="hotspot-cursor group absolute rounded-[14px] disabled:pointer-events-none"
    >
      {pop && (
        <span
          aria-hidden
          style={{
            backgroundImage: `url(${popImg})`,
            backgroundSize: `${10000 / width}% ${10000 / height}%`,
            backgroundPosition: `${(left / (100 - width)) * 100}% ${(top / (100 - height)) * 100}%`,
          }}
          className={`absolute inset-0 rounded-[inherit] opacity-0 scale-100 transition-all duration-200 group-hover:opacity-100 group-hover:scale-[var(--pop)] group-focus-visible:opacity-100 group-focus-visible:scale-[var(--pop)] motion-reduce:transition-none pointer-events-none ${maskClass}`}
        />
      )}

      {ring && (
        <span
          aria-hidden
          style={{
            backgroundImage: `url(${ROOM_IMG_DARK})`,
            backgroundSize: `${10000 / width}% ${10000 / height}%`,
            backgroundPosition: `${(left / (100 - width)) * 100}% ${(top / (100 - height)) * 100}%`,
            clipPath,
          }}
          className={`absolute inset-0 rounded-[inherit] opacity-0 animate-ring motion-reduce:animate-none pointer-events-none ${
            clipPath ? "" : "[mask-image:radial-gradient(ellipse_at_center,black_38%,transparent_70%)]"
          }`}
        />
      )}

      {ring && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-[inherit] opacity-0 animate-ring-glow motion-reduce:animate-none mix-blend-screen pointer-events-none bg-[radial-gradient(ellipse_at_center,theme(colors.amber/65%),theme(colors.amber/26%)_45%,transparent_74%)]"
        />
      )}

      {pop && (
        <span
          aria-hidden
          className={`absolute inset-0 rounded-[inherit] mix-blend-screen opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none ${glowClass}`}
        />
      )}
    </button>
  );
}
