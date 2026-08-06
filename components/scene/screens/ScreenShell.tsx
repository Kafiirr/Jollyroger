"use client";
import { ReactNode, useEffect, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { ROOM_IMG_BRIGHT, ROOM_IMG_NIGHT } from "@/lib/spots";
import { ViewportScale } from "@/components/ui/ViewportScale";

function useCurrentRoomBg(): string {
  const [bg, setBg] = useState(ROOM_IMG_BRIGHT);

  useEffect(() => {
    const update = () => {
      const forced = new URLSearchParams(window.location.search).get("hour");
      const h = forced !== null && forced !== "" ? Number(forced) : new Date().getHours();
      setBg(h >= 6 && h < 18 ? ROOM_IMG_BRIGHT : ROOM_IMG_NIGHT);
    };
    update();
  }, []);

  return bg;
}

/**
 * ScreenShell — Common container for object screens with dynamic room background
 */
export function ScreenShell({
  title,
  onClose,
  children,
}: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const roomBg = useCurrentRoomBg();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
    >
      {/* Blurred room background matching current time of day */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={roomBg}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none blur-[3px] scale-[1.03] transition-all duration-500"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_45%,theme(colors.bg/55%),theme(colors.bg/85%))]" />
      </div>

      <button
        onClick={onClose}
        className="fixed top-6 left-6 z-10 inline-flex items-center gap-1.5 bg-glass border border-glassline text-cream text-xs font-bold px-4 py-2.5 rounded-full backdrop-blur-md hover:border-amber hover:text-amber transition-colors"
      >
        <ArrowLeft size={14} weight="bold" aria-hidden />
        Back to room
      </button>
      <div className="relative flex-1 min-h-0">
        <ViewportScale className="px-4 py-6 pt-20 sm:px-6">
          {children}
        </ViewportScale>
      </div>
    </div>
  );
}
