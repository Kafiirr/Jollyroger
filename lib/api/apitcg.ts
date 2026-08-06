/**
* apitcg.com — TCG    (read-only,  ).
* (//  — lib/api/apitcgGames.ts)    URL .
* ⚠️ (price)   — ·.
* : APITCG_API_KEY (.env.local / Vercel ,   ).    →  (API ) .
 * 스키마 출처: GET https:// www.apitcg.com/api/<game>/cards?name= ( x-api-key).
 */
import type { ApiTcgGame } from "./apitcgGames";

const base = (gameId: string) => `https://www.apitcg.com/api/${gameId}/cards`;

interface ApiTcgCardRaw {
  id: string;
  code: string;
  name: string;
  rarity?: string;
  type?: string;
  color?: string;
  set?: { name?: string };
  images?: { small?: string; large?: string };
}

export interface OnePieceCard {
  id: string; // (: ST14-001)
  name: string;
  rarity?: string;
  type?: string;
  setName?: string;
  imageUrl: string; // large ,  small
}

/**  URL "_"   (· ) — : ST01-007_p1 */
function cardFileKey(imageUrl: string): string | null {
  return imageUrl.match(/([A-Za-z0-9]+-[0-9]+(?:_p\d+)?)\.(?:png|jpe?g|webp)/i)?.[1]?.toUpperCase() ?? null;
}

function mapCards(data: { data?: ApiTcgCardRaw[] }): OnePieceCard[] {
  return (data.data ?? [])
    .map((c) => {
      const imageUrl = c.images?.large || c.images?.small || "";
      // id    (   OP01-016 / OP01-016_p1   — React key  ).
      // c.id(-, : mcd17-8) — c.code("6/12" )    key  .
      const file = cardFileKey(imageUrl);
      return {
        id: file ?? c.id ?? c.code,
        name: c.name,
        rarity: c.rarity,
        type: c.type,
        setName: c.set?.name,
        imageUrl,
      };
    })
    .filter((c) => c.imageUrl);
}

/**  (+)   — /    .
*      URL   URL ( ). */
function dedupeByImage(cards: OnePieceCard[]): OnePieceCard[] {
  const seen = new Set<string>();
  return cards.filter((c) => {
    const k = cardFileKey(c.imageUrl) ?? c.imageUrl.replace(/\?.*/, "");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** "op01 016" / "OP1-16" / "st03-017" / "p-061" →   .    null */
export function toCardCode(q: string): string | null {
  const m = q.trim().match(/^(op|st|eb|prb)\s*-?\s*0*(\d+)\s*[-.\s]\s*0*(\d+)$/i);
  if (m) return `${m[1].toUpperCase()}${m[2].padStart(2, "0")}-${m[3].padStart(3, "0")}`;
  const p = q.trim().match(/^p\s*-?\s*0*(\d+)$/i);
  if (p) return `P-${p[1].padStart(3, "0")}`;
  return null;
}

async function fetchCards(
  gameId: string,
  param: "name" | "id",
  value: string,
  limit: number,
  key: string
): Promise<OnePieceCard[]> {
  const res = await fetch(`${base(gameId)}?${param}=${encodeURIComponent(value)}&limit=${limit}`, {
    headers: { "x-api-key": key },
    next: { revalidate: 3600 }, //
  });
  if (!res.ok) throw new Error(`apitcg API ${res.status}`);
  return mapCards((await res.json()) as { data?: ApiTcgCardRaw[] });
}

/**
*    — apitcg      .
*  (en.) , JP    (www.)    .
* apitcg    (_pN) , _p1~_p8    HEAD  .
 */
const OFFICIAL_HOSTS = ["en.onepiece-cardgame.com", "asia-en.onepiece-cardgame.com", "www.onepiece-cardgame.com"] as const;

/**
* apitcg      — apitcg  /(500)    .
*      URL  (.../card/{CODE}.png,  _pN).
* base + _p1.._p8  HEAD     .
* ⚠️  '' apitcg ,     (    ).
 */
async function fetchOfficialByCode(code: string): Promise<OnePieceCard[]> {
  const suffixes = ["", ...Array.from({ length: 8 }, (_, i) => `_p${i + 1}`)];
  const found: OnePieceCard[] = [];
  await Promise.all(
    suffixes.map(async (suffix) => {
      for (const host of OFFICIAL_HOSTS) {
        const url = `https://${host}/images/cardlist/card/${code}${suffix}.png`;
        try {
          const head = await fetch(url, { method: "HEAD" });
          if (head.ok) {
            found.push({
              id: suffix ? `${code}${suffix}` : code,
              name: suffix ? `${code} (Alt art)` : code,
              imageUrl: url,
            });
            return; // —
          }
        } catch {
          //
        }
      }
    })
  );
  // base( )
  return found.sort((a, b) => a.id.localeCompare(b.id));
}

async function probeMissingParallels(code: string, existing: OnePieceCard[]): Promise<OnePieceCard[]> {
  const have = new Set(
    existing.map((c) => c.imageUrl.match(/_p(\d+)\.(?:png|jpe?g|webp)/i)?.[1] ?? "base")
  );
  const baseName = existing[0]?.name ?? code;

  const found: OnePieceCard[] = [];
  await Promise.all(
    Array.from({ length: 8 }, (_, i) => i + 1)
      .filter((n) => !have.has(String(n)))
      .map(async (n) => {
        for (const host of OFFICIAL_HOSTS) {
          const url = `https://${host}/images/cardlist/card/${code}_p${n}.png`;
          try {
            const head = await fetch(url, { method: "HEAD" });
            if (head.ok) {
              found.push({
                id: `${code}_p${n}`,
                name: host.startsWith("www") ? `${baseName} (JP promo)` : `${baseName} (Alt art)`,
                imageUrl: url,
              });
              return; // —
            }
          } catch {
            //
          }
        }
      })
  );
  return found;
}

/**
* ()   —     `_p1`, `_p2`
* /   (: ST03-017_p1.png = Love-Love Mellow  ).
* apitcg   , HEAD     .
*   ( ) .
 */
async function withParallelArts(cards: OnePieceCard[]): Promise<OnePieceCard[]> {
  if (cards.length === 0 || cards.length > 8) return cards;

  const out: OnePieceCard[] = [];
  await Promise.all(
    cards.map(async (card) => {
      out.push(card);
      // URL    ( _pN  )
      const m = card.imageUrl.match(/^(.*?)(_p\d+)?\.png/);
      if (!m) return;
      const probes = [1, 2].map((n) => `${m[1]}_p${n}.png`).filter((u) => !card.imageUrl.startsWith(u));
      await Promise.all(
        probes.map(async (url, i) => {
          try {
            const head = await fetch(url, { method: "HEAD" });
            if (head.ok) {
              out.push({
                ...card,
                id: `${card.id}_p${i + 1}`,
                name: `${card.name} (Alt art)`,
                imageUrl: url,
              });
            }
          } catch {
            //
          }
        })
      );
    })
  );
  return out;
}

/**
* TCG   —  apitcg .    ,   .
* 1) [ ]    (OP01-016, ST03-017, P-061 ) ?id=  —
*       (/_p1 /)   .  .
* 2)  (  ): apitcg  / ("Love-Love Mellow"
*    "love love mellow"  ) 0    .
*    [ ]      (_p1/_p2) HEAD  .
 */
export async function searchTcgCards(game: ApiTcgGame, query: string, limit = 24): Promise<OnePieceCard[]> {
  const key = process.env.APITCG_API_KEY;
  if (!key) throw new Error("APITCG_API_KEY not configured");

  // 1)    ( —       )
  // apitcg   +  (/)   .
  // (: OP08-106_p5     apitcg )
  if (game.codeSearch) {
    const code = toCardCode(query);
    if (code) {
      // apitcg ( ·500)   :      .
      let byCode: OnePieceCard[] = [];
      try {
        byCode = await fetchCards(game.id, "id", code, limit, key);
      } catch {
        // apitcg  —
      }
      if (byCode.length > 0) {
        const extra = await probeMissingParallels(code, byCode);
        return dedupeByImage([...byCode, ...extra]);
      }
      // —     authoritative
      // (   ). apitcg
      // 500     .
      return await fetchOfficialByCode(code);
    }
  }

  // 1b)   ID  —   "SVP 173"   (svp 173 / svp-173).
  // " + "  (  ). "meowth sv-p"(+)   .
  if (game.id === "pokemon") {
    const m = query.trim().match(/^([a-z][a-z0-9.]{1,9})[\s-]+(\d+[a-z]*)$/i);
    if (m) {
      const byId = await fetchCards(game.id, "id", `${m[1].toLowerCase()}-${m[2]}`, limit, key);
      if (byId.length > 0) return byId;
    }
    // +   (: "rayquaza vmax 218") —     .
    // apitcg  id "-"(swsh7-218)       .
    const nm = query.trim().match(/^(.+?[a-z])\s+(\d{1,4})$/i);
    if (nm) {
      const byName = await fetchCards(game.id, "name", nm[1], limit, key);
      const byNumber = byName.filter((c) => c.id.toLowerCase().endsWith(`-${nm[2].toLowerCase()}`));
      if (byNumber.length > 0) return byNumber;
    }
  }

  // 2)
  let cards = await fetchCards(game.id, "name", query, limit, key);
  if (cards.length === 0) {
    // : 3
    const longest = query
      .split(/[\s-]+/)
      .filter((w) => w.length >= 3)
      .sort((a, b) => b.length - a.length)[0];
    if (longest && longest.toLowerCase() !== query.toLowerCase()) {
      cards = await fetchCards(game.id, "name", longest, limit, key);
    }
  }
  return dedupeByImage(game.codeSearch ? await withParallelArts(cards) : cards);
}
