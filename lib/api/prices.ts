/**
*     ( ) —   .
*  - Pokémon: pokemontcg.io —  TCGplayer  (  ,   rate limit↑).
*             raw/NM  (PSA)  (graded=false).
*  - One Piece   : TCGGO / PokemonPriceTracker — eBay  ,   .
*              (POKEMON_PRICE_TRACKER_KEY).   null  →   .
* ⚠️     —  /api/price ().  Supabase 24h .
 */

export interface MarketPrice {
  priceUsd: number;
/**   — "pokemontcg.io" | "tcggo" | "snapshot" */
  source: string;
/**    (ISO) */
  asOf: string;
/** eBay   () */
  sampleSize?: number;
/** (PSA )  . pokemontcg.io raw false */
  graded: boolean;
/**    (: TCGplayer  ) —    URL  */
  sourceUrl?: string;
}

interface TcgPlayerPriceRow {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
}

/**  (holofoil/normal/reverseHolofoil…)     — market ,  mid. */
function pickMarket(prices: Record<string, TcgPlayerPriceRow | undefined>): number | null {
  const rows = Object.values(prices).filter(Boolean) as TcgPlayerPriceRow[];
  const byMarket = rows.map((r) => r.market).find((n): n is number => typeof n === "number" && n > 0);
  if (byMarket != null) return byMarket;
  const byMid = rows.map((r) => r.mid).find((n): n is number => typeof n === "number" && n > 0);
  return byMid ?? null;
}

/** Pokémon  — pokemontcg.io.      market . */
export async function getPokemonPrice(name: string): Promise<MarketPrice | null> {
  const key = process.env.POKEMONTCG_API_KEY; // —  rate limit
  const q = encodeURIComponent(`name:"${name}"`);
  const url = `https://api.pokemontcg.io/v2/cards?q=${q}&orderBy=-set.releaseDate&pageSize=8`;
  try {
    const res = await fetch(url, {
      headers: key ? { "X-Api-Key": key } : {},
      cache: "no-store", // fetch
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { tcgplayer?: { url?: string; prices?: Record<string, TcgPlayerPriceRow>; updatedAt?: string } }[];
    };
    for (const c of json.data ?? []) {
      const prices = c.tcgplayer?.prices;
      if (!prices) continue;
      const market = pickMarket(prices);
      if (market != null) {
        return {
          priceUsd: Math.round(market * 100) / 100,
          source: "pokemontcg.io",
          asOf: c.tcgplayer?.updatedAt ?? new Date().toISOString(),
          graded: false,
          sourceUrl: c.tcgplayer?.url, // TCGplayer
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**    ·      .
*  : "PSA 10 Gem Mint 2023 Ruler of the Black Flame #134 Charizard EX" → "Ruler of the Black Flame Charizard EX" */
function cleanCardName(raw: string): string {
  return raw
    .replace(/\b(PSA|CGC|BGS|SGC)\s*\d+(\.\d+)?\b/gi, "")
    .replace(/\bgem\s*mint\b/gi, "")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/#\s*\d+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** grade  PSA   ("PSA 10 Gem Mint" → "10"). PSA  null. */
function psaGrade(grade?: string): string | null {
  return grade?.match(/psa\s*(\d+)/i)?.[1] ?? null;
}

interface PptCard {
  prices?: { market?: number };
  ebay?: Record<string, { avg?: number } | undefined>;
  tcgPlayerId?: string | number;
}

/**
* Pokémon  — PokemonPriceTracker( ). raw prices.market,  ebay.psaN.avg.
* (POKEMON_PRICE_TRACKER_KEY) .   null →  pokemontcg.io/ .
* : GET /api/v2/cards?search=&includeEbay=true — data[].prices.market, data[].ebay.psa10.avg .
 */
export async function getPokemonTrackerPrice(name: string, grade?: string): Promise<MarketPrice | null> {
  const key = process.env.POKEMON_PRICE_TRACKER_KEY;
  if (!key) return null;
  const psa = psaGrade(grade);
  try {
    const params = new URLSearchParams({ search: cleanCardName(name) });
    if (psa) params.set("includeEbay", "true"); // eBay
    const res = await fetch(`https://www.pokemonpricetracker.com/api/v2/cards?${params}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: PptCard[] };
    const card = json.data?.[0];
    if (!card) return null;

    let priceUsd: number | undefined;
    let graded = false;
    const gradedAvg = psa ? card.ebay?.[`psa${psa}`]?.avg : undefined;
    if (gradedAvg != null) {
      priceUsd = gradedAvg; // (PSA N)
      graded = true;
    } else if (card.prices?.market != null) {
      priceUsd = card.prices.market; // raw
    } else if (card.ebay?.psa10?.avg != null) {
      priceUsd = card.ebay.psa10.avg; // raw    PSA10
      graded = true;
    }
    if (priceUsd == null) return null;

    return {
      priceUsd: Math.round(priceUsd * 100) / 100,
      source: "pokemonpricetracker",
      asOf: new Date().toISOString(),
      graded,
      sourceUrl: card.tcgPlayerId
        ? `https://www.tcgplayer.com/product/${card.tcgPlayerId}`
        : undefined,
    };
  } catch {
    return null;
  }
}
