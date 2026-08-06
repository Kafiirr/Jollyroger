"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { SPOTS, type Spot, type SpotId } from "@/lib/spots";
import { quadMatrix3d, type Corners, type Pt } from "@/lib/quad";
import { useElementSize } from "@/lib/useElementSize";

/**
* (   )       .
*   `?edit`   (   ).
*  -    (/// ) .
*  - ()  =  ,    =   (·   )
*  -  =    (Shift=×5).  /   .
*  - "Solid fill" =     (     ), Opacity   .
*  -  /  lib/spots.ts  overlay
 */
const BASE = 100;
type CornerKey = "tl" | "tr" | "br" | "bl";
const CORNER_KEYS: CornerKey[] = ["tl", "tr", "br", "bl"];
const CORNER_LABEL: Record<CornerKey, string> = { tl: "TL", tr: "TR", br: "BR", bl: "BL" };

/**  overlay corners > clip() > area()   */
function seedCorners(spot: Spot): Corners {
  if (spot.overlay) return spot.overlay.corners;
  if (spot.clip && Array.isArray(spot.clip) && spot.clip.length >= 4) {
    return { tl: spot.clip[0], tr: spot.clip[1], br: spot.clip[2], bl: spot.clip[3] };
  }
  const { left, top, width, height } = spot.area;
  return {
    tl: [left, top],
    tr: [left + width, top],
    br: [left + width, top + height],
    bl: [left, top + height],
  };
}

export function OverlayEditor({
  spotId,
  onSpotChange,
  sceneRef,
}: {
  spotId: SpotId;
  onSpotChange: (id: SpotId) => void;
  sceneRef: RefObject<HTMLDivElement | null>;
}) {
  const spot = SPOTS.find((s) => s.id === spotId)!;
  const src = spot.overlay?.src ?? "/picture_v1.jpg"; // (  )

  const [corners, setCorners] = useState<Corners>(() => seedCorners(spot));
  const [selected, setSelected] = useState<CornerKey>("tl");
  const [solid, setSolid] = useState<boolean>(!spot.overlay); //
  const [opacity, setOpacity] = useState<number>(0.85);
  const cornersRef = useRef(corners);
  cornersRef.current = corners;
  const { width, height } = useElementSize(sceneRef);

  const round = (n: number) => Math.round(n * 10) / 10;

  // (px) →   %
  const toPct = useCallback(
    (dxPx: number, dyPx: number) => {
      const r = sceneRef.current?.getBoundingClientRect();
      const w = r?.width || 1;
      const h = r?.height || 1;
      return { dx: (dxPx / w) * 100, dy: (dyPx / h) * 100 };
    },
    [sceneRef]
  );

  // key === null   ,
  const startDrag = (key: CornerKey | null) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (key) setSelected(key);
    const startX = e.clientX;
    const startY = e.clientY;
    const start = cornersRef.current;
    const onMove = (ev: PointerEvent) => {
      const { dx, dy } = toPct(ev.clientX - startX, ev.clientY - startY);
      const shift = (p: Pt): Pt => [round(p[0] + dx), round(p[1] + dy)];
      if (key) {
        setCorners({ ...start, [key]: shift(start[key]) });
      } else {
        setCorners({ tl: shift(start.tl), tr: shift(start.tr), br: shift(start.br), bl: shift(start.bl) });
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // =     (Shift=×5)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      e.preventDefault();
      const step = e.shiftKey ? 1 : 0.2;
      setCorners((c) => {
        const [x, y] = c[selected];
        let nx = x;
        let ny = y;
        if (e.key === "ArrowRight") nx = round(x + step);
        if (e.key === "ArrowLeft") nx = round(x - step);
        if (e.key === "ArrowDown") ny = round(y + step);
        if (e.key === "ArrowUp") ny = round(y - step);
        return { ...c, [selected]: [nx, ny] as Pt };
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const setCorner = (key: CornerKey, axis: 0 | 1, value: number) =>
    setCorners((c) => {
      const p: Pt = [...c[key]] as Pt;
      p[axis] = value;
      return { ...c, [key]: p };
    });

  const fmt = (p: Pt) => `[${round(p[0])}, ${round(p[1])}]`;
  const line = `overlay: { src: "${src}", corners: { tl: ${fmt(corners.tl)}, tr: ${fmt(corners.tr)}, br: ${fmt(corners.br)}, bl: ${fmt(corners.bl)} } },`;

  // area(· ) =    .  area    spots.ts .
  const xs = [corners.tl[0], corners.tr[0], corners.br[0], corners.bl[0]];
  const ys = [corners.tl[1], corners.tr[1], corners.br[1], corners.bl[1]];
  const areaLeft = round(Math.min(...xs));
  const areaTop = round(Math.min(...ys));
  const areaWidth = round(Math.max(...xs) - areaLeft);
  const areaHeight = round(Math.max(...ys) - areaTop);
  const areaLine = `area: { left: ${areaLeft}, top: ${areaTop}, width: ${areaWidth}, height: ${areaHeight} },`;

  // clip( ) —  ( ) /   . spots.ts  clip  .
  const clipLine = `clip: { tl: ${fmt(corners.tl)}, tr: ${fmt(corners.tr)}, br: ${fmt(corners.br)}, bl: ${fmt(corners.bl)} },`;

  const matrix = width && height ? quadMatrix3d(corners, width, height, BASE) : "";

  const handleCls =
    "absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] border-2 rounded-full pointer-events-auto cursor-move";

  return (
    <>
      {/* info info(info info info info info info info info) — info info info info */}
      {matrix && (
        <div
          onPointerDown={startDrag(null)}
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: BASE,
            height: BASE,
            transformOrigin: "0 0",
            transform: matrix,
            opacity,
          }}
          className="cursor-move select-none z-[60] outline outline-2 outline-amber"
        >
          {solid ? (
            <div className="w-full h-full bg-[#0a0814]" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" draggable={false} className="block w-full h-full select-none pointer-events-none" />
          )}
        </div>
      )}

      {/* info info (info info info % info info) */}
      <div className="absolute inset-0 z-[61] pointer-events-none">
        {CORNER_KEYS.map((k) => (
          <span
            key={k}
            onPointerDown={startDrag(k)}
            title={CORNER_LABEL[k]}
            style={{ left: `${corners[k][0]}%`, top: `${corners[k][1]}%` }}
            className={`${handleCls} ${
              selected === k ? "bg-amber border-cream" : "bg-inkdark border-amber"
            }`}
          />
        ))}
      </div>

      {/* info info */}
      <div className="fixed top-3 left-3 z-[70] w-[300px] rounded-xl bg-[#0e0b1a]/95 border border-glassline p-3 text-cream text-xs space-y-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="font-bold text-amber tracking-wide">📐 Overlay corner editor</div>

        {/* info info info */}
        <div className="flex flex-wrap gap-1">
          {SPOTS.map((s) => (
            <button
              key={s.id}
              onClick={() => onSpotChange(s.id)}
              className={`px-1.5 py-0.5 rounded border text-[10px] ${
                s.id === spotId
                  ? "bg-amber text-inkdark border-amber font-bold"
                  : "bg-cream/10 border-glassline text-creamdim/80 hover:border-amber"
              }`}
            >
              {s.id}
            </button>
          ))}
        </div>

        {/* info info info */}
        <div className="flex items-center justify-between gap-2 border-t border-glassline pt-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={solid} onChange={(e) => setSolid(e.target.checked)} className="accent-amber" />
            <span className="text-creamdim/80">Solid fill (info)</span>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-creamdim/60">opacity</span>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-16 accent-amber"
            />
          </label>
        </div>

        <div className="space-y-1.5">
          {CORNER_KEYS.map((k) => (
            <div
              key={k}
              onClick={() => setSelected(k)}
              className={`flex items-center gap-2 rounded px-1 py-0.5 cursor-pointer ${
                selected === k ? "bg-amber/15" : ""
              }`}
            >
              <span className="w-7 font-mono text-creamdim/80">{CORNER_LABEL[k]}</span>
              {([0, 1] as const).map((axis) => (
                <label key={axis} className="flex items-center gap-1">
                  <span className="text-creamdim/60">{axis === 0 ? "x" : "y"}</span>
                  <input
                    type="number"
                    step={0.1}
                    value={corners[k][axis]}
                    onChange={(e) => setCorner(k, axis, parseFloat(e.target.value) || 0)}
                    className="w-16 bg-cream/10 border border-glassline rounded px-1.5 py-0.5 text-right outline-none focus:border-amber"
                  />
                </label>
              ))}
            </div>
          ))}
        </div>
        <div className="text-[10px] leading-relaxed text-creamdim/70">
          info info=info info · info=info info(info) · info=info info info(Shift=×5)
        </div>

        {/* info·info info(area) — info info spots.ts info info area info info info info info. */}
        <div className="border-t border-glassline pt-2 space-y-1">
          <div className="text-[10px] font-bold text-amber">Hover / click area (spots.ts)</div>
          <textarea
            readOnly
            value={areaLine}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full h-12 bg-black/40 border border-glassline rounded p-1.5 font-mono text-[10px] leading-snug resize-none"
          />
          <button
            onClick={() => navigator.clipboard?.writeText(areaLine)}
            className="w-full bg-amber text-inkdark font-bold rounded py-1.5 hover:brightness-110 transition"
          >
            Copy area line
          </button>
        </div>

        {/* clip(info info) — info info info info/info info. spots.ts info clip info info. */}
        <div className="border-t border-glassline pt-2 space-y-1">
          <div className="text-[10px] font-bold text-amber">Clip polygon (spots.ts clip)</div>
          <textarea
            readOnly
            value={clipLine}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full h-12 bg-black/40 border border-glassline rounded p-1.5 font-mono text-[10px] leading-snug resize-none"
          />
          <button
            onClick={() => navigator.clipboard?.writeText(clipLine)}
            className="w-full bg-amber text-inkdark font-bold rounded py-1.5 hover:brightness-110 transition"
          >
            Copy clip line
          </button>
        </div>

        {/* info(info info info info) info — info info info info */}
        <div className="border-t border-glassline pt-2 space-y-1">
          <div className="text-[10px] text-creamdim/60">Overlay corners (info info info)</div>
          <textarea
            readOnly
            value={line}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full h-16 bg-black/40 border border-glassline rounded p-1.5 font-mono text-[10px] leading-snug resize-none"
          />
          <button
            onClick={() => navigator.clipboard?.writeText(line)}
            className="w-full bg-cream/10 border border-glassline text-cream rounded py-1.5 hover:border-amber transition"
          >
            Copy overlay line
          </button>
        </div>
      </div>
    </>
  );
}
