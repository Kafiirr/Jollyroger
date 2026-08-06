import type { MarketPrice } from "@/lib/api/prices";

/**
*     —  API //  .
*       (  ""  ).
*      —   /api/price  API  .
 *
* : `${franchise}|${  }`   (   ).
*     =  .    null → UI "—" .
 */
interface SnapshotEntry {
  franchise: string; // (: "one piece", "pokémon")
  nameIncludes: string; // ()
  priceUsd: number;
}

const SNAPSHOT: SnapshotEntry[] = [
  // One Piece
  { franchise: "one piece", nameIncludes: "luffy", priceUsd: 42.0 },
  { franchise: "one piece", nameIncludes: "zoro", priceUsd: 28.5 },
  { franchise: "one piece", nameIncludes: "nami", priceUsd: 19.0 },
  { franchise: "one piece", nameIncludes: "shanks", priceUsd: 65.0 },
  { franchise: "one piece", nameIncludes: "ace", priceUsd: 33.0 },
  // Pokémon ( API    )
  { franchise: "pokémon", nameIncludes: "charizard", priceUsd: 320.0 },
  { franchise: "pokemon", nameIncludes: "pikachu", priceUsd: 24.0 },
];

/**    —   null. */
export function snapshotPrice(franchise: string, name: string): MarketPrice | null {
  const f = franchise.trim().toLowerCase();
  const n = name.trim().toLowerCase();
  const hit = SNAPSHOT.find((e) => (f.includes(e.franchise) || e.franchise.includes(f)) && n.includes(e.nameIncludes));
  if (!hit) return null;
  return { priceUsd: hit.priceUsd, source: "snapshot", asOf: "static", graded: false };
}

/**
*  (curated) — PriceCharting     +  .
*  API ****  /    · .
* :   (OP01-016 ,  URL )   —
*        (: "Nami (JP promo)")     .
*          .
 */
interface CuratedEntry {
/**    (, : "OP01-016").    */
  code?: string;
/**      —  ()  */
  nameIncludes?: string;
  priceUsd: number;
  url: string; // PriceCharting
}

const CURATED: CuratedEntry[] = [
  // Pokémon —
  { nameIncludes: "eevee", priceUsd: 340, url: "https://www.pricecharting.com/game/pokemon-brilliant-stars/eevee-tg11" },
  { nameIncludes: "pikachu on the ball", priceUsd: 967.39, url: "https://www.pricecharting.com/game/pokemon-promo/pikachu-on-the-ball-1?q=pikachu+on+the+ball+1" },
  { nameIncludes: "meowth", priceUsd: 194, url: "https://www.pricecharting.com/game/pokemon-phantasmal-flames/meowth-106" },
  // One Piece —    (    )
  { code: "ST16-001", priceUsd: 719.36, url: "https://www.pricecharting.com/game/one-piece-japanese-starter-deck-16-uta/uta-storage-box-set-gold-st16-001" }, // Uta (JP promo)
  { code: "ST01-007", priceUsd: 1700.43, url: "https://www.pricecharting.com/game/one-piece-japanese-starter-deck-1-straw-hat-crew/nami-storage-box-set-gold-st01-007" }, // Nami (JP promo)
  { code: "OP10-005", priceUsd: 1560.25, url: "https://www.pricecharting.com/game/one-piece-japanese-promo/sanji-flagship-battle-op10-005" }, // Sanji (Alt art)
  { code: "OP01-016", priceUsd: 803.62, url: "https://www.pricecharting.com/game/one-piece-romance-dawn/nami-special-alternate-art-op01-016" }, // Nami
  { code: "ST13-003", priceUsd: 1596.29, url: "https://www.pricecharting.com/game/one-piece-ultra-deck-the-three-brothers/monkeydluffy-bvb-promo-st13-003" }, // Monkey.D.Luffy
  { code: "OP05-067", priceUsd: 945.0, url: "https://www.pricecharting.com/game/one-piece-awakening-of-the-new-era/zoro-juurou-sp-foil-op05-067" }, // Zoro-Juurou
  { code: "OP08-106", priceUsd: 416.39, url: "https://www.pricecharting.com/game/one-piece-japanese-two-legends/nami-promotion-pack-ex-op08-106" }, // Nami (JP promo)
  { code: "OP07-051", priceUsd: 3250, url: "https://www.pricecharting.com/game/one-piece-500-years-in-the-future/boa-hancock-alternate-art-manga-op07-051" }, // Boa Hancock
];

/**    —   null.  ·API  .
*  code(   )    ,    . */
export function curatedPrice(name: string, code?: string): MarketPrice | null {
  const n = name.trim().toLowerCase();
  const cc = code?.trim().toUpperCase();
  const hit = CURATED.find((e) =>
    e.code ? cc === e.code : e.nameIncludes ? n.includes(e.nameIncludes) : false
  );
  if (!hit) return null;
  return { priceUsd: hit.priceUsd, source: "pricecharting", asOf: "verified", graded: true, sourceUrl: hit.url };
}
