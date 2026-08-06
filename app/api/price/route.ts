import { NextRequest, NextResponse } from "next/server";
import { getPokemonPrice, getPokemonTrackerPrice, type MarketPrice } from "@/lib/api/prices";
import { curatedPrice, snapshotPrice } from "@/lib/priceSnapshot";
import { supabase } from "@/lib/supabase";

/**
*      ( ).
 *   GET /api/price?name=Charizard&franchise=Pokémon&grade=PSA%2010
* : Supabase 24h  →  API(pokemontcg.io / TCGGO) →   .
*   -  (card_prices)   graceful (  ).
*   -    { price: null } (UI "—" ).
*   API      +  .
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CacheRow {
  key: string;
  price_usd: number;
  source: string;
  as_of: string;
  graded: boolean;
  fetched_at: string;
}

async function readCache(key: string): Promise<MarketPrice | null> {
  try {
    const { data, error } = await supabase
      .from("card_prices")
      .select("*")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as CacheRow;
    if (Date.now() - new Date(row.fetched_at).getTime() > CACHE_TTL_MS) return null; //
    return { priceUsd: row.price_usd, source: row.source, asOf: row.as_of, graded: row.graded };
  } catch {
    return null; // / →
  }
}

async function writeCache(key: string, p: MarketPrice): Promise<void> {
  try {
    await supabase.from("card_prices").upsert(
      {
        key,
        price_usd: p.priceUsd,
        source: p.source,
        as_of: p.asOf,
        graded: p.graded,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  } catch {
    // (   )
  }
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const name = p.get("name")?.trim();
  const franchise = (p.get("franchise") ?? "").trim();
  const grade = p.get("grade")?.trim() || undefined;
  const code = p.get("code")?.trim() || undefined; // (OP01-016 ) —
  if (!name) return NextResponse.json({ price: null }, { status: 400 });

  const key = `${franchise}|${name}|${grade ?? ""}`.toLowerCase();

  // 0)  (curated) — PriceCharting . /  .
  const curated = curatedPrice(name, code);
  if (curated) return NextResponse.json({ price: curated });

  // 1)
  const cached = await readCache(key);
  if (cached) return NextResponse.json({ price: cached, cached: true });

  // 2)  API. : PokemonPriceTracker( ) → pokemontcg.io(raw) .
  // ( )      .
  let price: MarketPrice | null = null;
  if (/pok[eé]?mon/i.test(franchise)) {
    price = (await getPokemonTrackerPrice(name, grade)) ?? (await getPokemonPrice(name));
  }

  // 3)
  if (!price) price = snapshotPrice(franchise, name);

  // TCGplayer   (·  )
  if (price && !price.sourceUrl) {
    price.sourceUrl = `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(name)}`;
  }

  if (price) await writeCache(key, price);
  return NextResponse.json({ price });
}
