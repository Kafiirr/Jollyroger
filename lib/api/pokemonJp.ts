/**
*     —   DB(pokemon-card.com) resultAPI (read-only,  ).
* apitcg( )    (SV-P ) .
*    PokeAPI  (species)
* (: "meowth" → "ニャース").    (  )    .
*   —   API.
 */
import type { OnePieceCard } from "./apitcg";

const JP_BASE = "https://www.pokemon-card.com";

interface JpApiCard {
  cardID: string;
  cardThumbFile: string;
  cardNameViewText: string;
}

/**
* " + "   — PSA    (: "necrozma sm8b", "meowth sv-p").
*    (  or -P ) ,  null.
 */
export function parseJpSetQuery(query: string): { name: string; setCode: string } | null {
  const tokens = query.trim().split(/\s+/);
  if (tokens.length < 2) return null;
  const last = tokens[tokens.length - 1];
  // (   —  +  )
  if (!/^[a-z0-9-]{2,7}$/i.test(last) || !/[a-z]/i.test(last) || !/\d|-?p$/i.test(last)) return null;
  return { name: tokens.slice(0, -1).join(" "), setCode: last.toUpperCase() };
}

/**    →   (PokeAPI  ).    null */
async function speciesLookup(slug: string): Promise<string | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${slug}`, {
      next: { revalidate: 86400 }, //
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      names?: { language: { name: string }; name: string }[];
    };
    return data.names?.find((n) => n.language.name === "ja-hrkt")?.name ?? null;
  } catch {
    return null;
  }
}

async function toJapaneseName(query: string): Promise<string | null> {
  const q = query.trim().toLowerCase();
  const full = await speciesLookup(q.replace(/\s+/g, "-"));
  if (full) return full;
  // "ultra necrozma"      —
  const words = q.split(/\s+/).filter((w) => w.length >= 3);
  const longest = words.sort((a, b) => b.length - a.length)[0];
  return longest && longest !== q ? speciesLookup(longest) : null;
}

/**      — /large/SV-P/047160_… → "SV-P" */
function setCodeFromThumb(path: string): string | undefined {
  return path.match(/\/card_images\/large\/([^/]+)\//)?.[1];
}

export async function searchPokemonJpCards(query: string, limit = 24): Promise<OnePieceCard[]> {
  // "necrozma sm8b"   —  /
  const parsed = parseJpSetQuery(query);
  const nameQuery = parsed?.name ?? query;

  const hasJapanese = /[぀-ヿ一-龯]/.test(nameQuery);
  const keyword = hasJapanese ? nameQuery.trim() : await toJapaneseName(nameQuery);
  if (!keyword) return [];

  // DB     (   ):
  // - :   + (SV-P )
  // - regulation_sidebar_form=all:    (,  )
  const search = async (regulationAll: boolean): Promise<JpApiCard[]> => {
    const url =
      `${JP_BASE}/card-search/resultAPI.php?keyword=${encodeURIComponent(keyword)}&sm_and_keyword=true` +
      (regulationAll ? "&regulation_sidebar_form=all" : "");
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 3600 },
      });
      if (!res.ok) return [];
      return ((await res.json()) as { cardList?: JpApiCard[] }).cardList ?? [];
    } catch {
      return [];
    }
  };
  const [promoSide, allSide] = await Promise.all([search(false), search(true)]);

  const seen = new Set<string>();
  let cards = [...promoSide, ...allSide]
    .filter((c) => {
      if (!c.cardThumbFile || seen.has(c.cardID)) return false;
      seen.add(c.cardID);
      return true;
    })
    .map((c) => ({
      id: `jp-${c.cardID}`,
      name: `${c.cardNameViewText} (JP)`,
      setName: setCodeFromThumb(c.cardThumbFile),
      imageUrl: `${JP_BASE}${c.cardThumbFile}`,
    }));

  if (parsed) {
    const bySet = cards.filter((c) => c.setName?.toUpperCase() === parsed.setCode);
    if (bySet.length > 0) cards = bySet; // ( )
  }
  return cards.slice(0, limit);
}
