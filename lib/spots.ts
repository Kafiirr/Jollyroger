/**    — (room_dark/bright_v3.png, 16:9 )  %.    . */
import type { Corners, Pt } from "./quad";

export type SpotId =
  | "cabinet"
  | "computer"
  | "phone"
  | "photo"
  | "album"
  | "note"
  | "figure"
  | "figure2"
  | "figure3"
  | "figure4"
  | "figure5"
  | "snack"
  | "ledger";

export interface Spot {
  id: SpotId;
  label: string;
/**   (  %) */
  area: { left: number; top: number; width: number; height: number };
/**    (0~1)   —  phone( )  */
  zoom: { cx: number; cy: number; scale: number };
/**    —       URL    (:  →  ) */
  href?: string;
  /**
*       (:    ).
*  (area) ,        .
* corners:    (   %). ·
*              / . (?edit  )
   */
  overlay?: { src: string; corners: Corners };
/** ·  area( )      (clip-path).
*    ( )      .
*      %(area  ). */
  clip?: Corners | Pt[];
/**  pop   ( 1.05 = 5%).   (·) 5% ''
*     1.03(3%)  . */
  popScale?: number;
}

// — room_v5(16:9)  ?edit  .
// 4  ( ) area . (figure   — placeholder)
// (ObjectScreen)    .
export const SPOTS: Spot[] = [
  { id: "cabinet",  label: "Card storage", area: { left: 4.4,  top: 4.5,  width: 36.1, height: 62.1 }, zoom: { cx: 0.14, cy: 0.29, scale: 2.2 }, popScale: 1.03 },
  { id: "computer", label: "Computer",     area: { left: 58.1, top: 31.7, width: 15.7, height: 18.4 }, zoom: { cx: 0.58, cy: 0.30, scale: 2.4 }, popScale: 1.03 },
  // quad(room_v5 ) —       overlay   src .
  // overlay: { src: "/picture_v1.jpg", corners: { tl: [56, 33.2], tr: [71.7, 32.8], br: [71.6, 51.2], bl: [56.2, 51.2] } }
  // :  PhotoScreen (  PhotoScreen.tsx PHOTO_SRC).
  // —    overlay   .
  // overlay: { src: "/picture_v1_cdither_g2_l4.jpg", corners: { tl: [72.1, 11.4], tr: [88.6, 11.4], br: [88.9, 26], bl: [71.9, 25.9] } }
  { id: "photo",    label: "Photo frame",  area: { left: 72.8, top: 8.6,  width: 21,   height: 17.6 }, zoom: { cx: 0.83, cy: 0.13, scale: 2.3 } },
  { id: "note",     label: "Guestbook",    area: { left: 18.6, top: 85.7, width: 17.6, height: 10.5 }, zoom: { cx: 0.16, cy: 0.80, scale: 2.5 } },
  // clip =      4(   %).
  // (         ).
  // ?edit  phone     . ( area  )
  { id: "phone",    label: "Phone",        area: { left: 63.7, top: 86.6, width: 10.5, height: 9.8 },  zoom: { cx: 0.68, cy: 0.89, scale: 2.2 }, clip: { tl: [63.7, 93.5], tr: [69.9, 86.6], br: [74.2, 89], bl: [68.6, 96.4] } },
  { id: "album",    label: "Album",        area: { left: 77,   top: 77.7, width: 13.9, height: 8.7 },  zoom: { cx: 0.79, cy: 0.80, scale: 2.2 } },
  // —  .     (  ).
  { id: "snack",    label: "Pouch",        area: { left: 41.9, top: 88.5, width: 7.9,  height: 8 },    zoom: { cx: 0.46, cy: 0.90, scale: 2.2 } },
  { id: "ledger",   label: "Provenance Ledger", area: { left: 32.5, top: 78.0, width: 12.5, height: 16.0 }, zoom: { cx: 0.36, cy: 0.86, scale: 2.3 }, popScale: 1.03, clip: [ [33.2, 80.5], [40.5, 78.5], [44.2, 79.8], [44.0, 83.0], [43.8, 87.2], [36.5, 93.0], [33.2, 93.0] ] },
  // 5 →    (href ,  ·zoom ). → .
  { id: "figure",   label: "Luffy",         area: { left: 76.2, top: 41.4, width: 3.8,  height: 12.7 }, zoom: { cx: 0.88, cy: 0.30, scale: 2.5 }, href: "https://en.wikipedia.org/wiki/Monkey_D._Luffy" },
  { id: "figure2",  label: "Zoro", area: { left: 81.2, top: 41.3, width: 3.8,  height: 12.7 }, zoom: { cx: 0.88, cy: 0.30, scale: 2.5 }, href: "https://en.wikipedia.org/wiki/Roronoa_Zoro" },
  { id: "figure3",  label: "Nami", area: { left: 85.8, top: 41.3, width: 3.8,  height: 12.7 }, zoom: { cx: 0.88, cy: 0.30, scale: 2.5 }, href: "https://en.wikipedia.org/wiki/Nami_(One_Piece)" },
  { id: "figure4",  label: "Sanji",   area: { left: 90.2, top: 41.4, width: 3.8,  height: 12.7 }, zoom: { cx: 0.88, cy: 0.30, scale: 2.5 }, href: "https://en.wikipedia.org/wiki/Sanji_(One_Piece)" },
  { id: "figure5",  label: "Chopper",       area: { left: 94.2, top: 42.2, width: 3.8,  height: 12.7 }, zoom: { cx: 0.88, cy: 0.30, scale: 2.5 }, href: "https://en.wikipedia.org/wiki/Tony_Tony_Chopper" },
];

export const IMG_ASPECT = 1672 / 941; // room_dark_v3 / room_bright_v3 (16:9 )

/**
*  ,         (   %).
*    , (phone.area)     .
* (?edit  phone  )
 */
export const PHONE_GLOW: { corners: Corners } = {
  corners: { tl: [51.8, 75.7], tr: [55.1, 76], br: [54.1, 82.3], bl: [50.6, 81.6] },
};

/** Room background image paths for time-of-day states */
export const ROOM_IMG_DARK = "/main.png";
export const ROOM_IMG_BRIGHT = "/room_bright_v3.png";
export const ROOM_IMG_NIGHT = "/room_dark_v3.png";
export const ROOM_IMG = ROOM_IMG_BRIGHT;
