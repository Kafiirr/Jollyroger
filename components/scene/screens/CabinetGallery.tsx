"use client";
import { useEffect, useMemo, useState } from "react";

/**       (ShelfCard ). */
interface GalleryCard {
  id: string;
  name: string;
  emoji: string;
  tint: string;
  imageUrl?: string;
}

const HOLD_MS = 4500; // (globals.css gallery-spotlight 4.5s )

/**
*  ()  —  .
*        (Ken Burns ) ,
*      (). /UI .
*    Esc   .
 */
export function CabinetGallery({ cards, onExit }: { cards: GalleryCard[]; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [hintGone, setHintGone] = useState(false);

  //
  useEffect(() => {
    if (cards.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % cards.length), HOLD_MS);
    return () => clearInterval(t);
  }, [cards.length]);

  // ()
  useEffect(() => {
    const t = setTimeout(() => setHintGone(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Esc  ( ) — capture   Scene Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onExit();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onExit]);

  const card = cards[index] ?? cards[0];
  // —
  const driftRow = useMemo(() => {
    if (!cards.length) return [];
    const out: GalleryCard[] = [];
    while (out.length < 10) out.push(...cards);
    return out.slice(0, 10);
  }, [cards]);

  if (!card) return null;

  return (
    <div
      onClick={onExit}
      role="dialog"
      aria-label="Card gallery"
      className="fixed inset-0 z-[60] bg-black overflow-hidden cursor-pointer select-none"
    >
      {/* info info — info info info info (info info info info info) */}
      <div aria-hidden className="absolute inset-0 opacity-[0.16] blur-[3px] motion-reduce:hidden">
        <div className="absolute top-[10%] left-0 flex gap-10 w-max animate-[gallery-drift_70s_linear_infinite]">
          {driftRow.concat(driftRow).map((c, i) => (
            <DriftThumb key={"a" + i} card={c} />
          ))}
        </div>
        <div className="absolute bottom-[10%] left-0 flex gap-10 w-max animate-[gallery-drift_90s_linear_infinite_reverse]">
          {driftRow.concat(driftRow).map((c, i) => (
            <DriftThumb key={"b" + i} card={c} />
          ))}
        </div>
      </div>

      {/* info — info info info info info */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_58%_68%_at_50%_50%,transparent_38%,rgba(0,0,0,0.9))]"
      />

      {/* info — info info info info (keyinfo info info info) */}
      <div className="absolute inset-0 grid place-items-center p-8">
        <div
          key={index}
          className="relative h-[68vh] max-h-[560px] aspect-[63/88] animate-[gallery-spotlight_4.5s_ease-in-out_both] motion-reduce:animate-[gallery-fade_4.5s_ease-in-out_both]"
        >
          {/* info info */}
          <div
            aria-hidden
            className="absolute -inset-8 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,theme(colors.amber/35%),transparent_70%)] blur-2xl"
          />
          <CardArt card={card} />
        </div>
      </div>

      {/* info info — info info info */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 text-cream/70 text-[11px] font-semibold uppercase tracking-[0.28em] transition-opacity duration-1000 ${
          hintGone ? "opacity-0" : "opacity-100"
        }`}
      >
        Tap anywhere to exit
      </div>
    </div>
  );
}

function CardArt({ card }: { card: GalleryCard }) {
  if (card.imageUrl) {
    return (
      <div className="w-full h-full relative rounded-2xl overflow-hidden border border-cream/15 bg-inkdark/80 shadow-[0_30px_60px_rgba(0,0,0,0.75)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.imageUrl}
          alt={card.name}
          draggable={false}
          className="w-[268%] max-w-none -ml-[84.5%] -mt-[68%] pointer-events-none select-none"
        />
      </div>
    );
  }
  return (
    <div
      className="w-full h-full rounded-2xl grid place-items-center border border-cream/15 shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
      style={{ background: card.tint }}
    >
      <span className="text-8xl">{card.emoji}</span>
    </div>
  );
}

function DriftThumb({ card }: { card: GalleryCard }) {
  return (
    <span
      className="block h-[22vh] aspect-[63/88] rounded-lg overflow-hidden shrink-0 border border-cream/10 bg-inkdark/80"
      style={card.imageUrl ? undefined : { background: card.tint }}
    >
      {card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.imageUrl} alt="" draggable={false} className="w-[268%] max-w-none -ml-[84.5%] -mt-[68%] pointer-events-none select-none" />
      ) : (
        <span className="grid place-items-center h-full text-4xl">{card.emoji}</span>
      )}
    </span>
  );
}
