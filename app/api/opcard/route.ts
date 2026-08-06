import { NextResponse } from "next/server";
import { searchTcgCards, toCardCode } from "@/lib/api/apitcg";
import { APITCG_GAMES, findGame } from "@/lib/api/apitcgGames";
import { parseJpSetQuery, searchPokemonJpCards } from "@/lib/api/pokemonJp";

/**
* TCG    —    .
* (?name=) apitcg.com     .
* ?game= /"all"      (    ).
* APITCG_API_KEY     (   ).
*  apitcg  · .
 */
export const revalidate = 3600;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const name = params.get("name")?.trim();
  if (!name) return NextResponse.json({ cards: [] });

  const gameParam = params.get("game") ?? "all";
  let games;
  if (gameParam === "all") {
    // (OP01-016 )    →   ( 6  )
    const codeGame = toCardCode(name) ? APITCG_GAMES.find((g) => g.codeSearch) : undefined;
    games = codeGame ? [codeGame] : APITCG_GAMES;
  } else {
    const game = findGame(gameParam);
    if (!game) return NextResponse.json({ error: "unknown game" }, { status: 400 });
    games = [game];
  }

  if (!process.env.APITCG_API_KEY) {
    return NextResponse.json({ error: "APITCG_API_KEY not configured" }, { status: 501 });
  }

  // /
  const perGame = games.length > 1 ? 12 : 24;
  // apitcg()       DB  .
  // ,    (: "rayquaza vmax 218")   —
  // DB        .
  const wantsPokemonJp = games.some((g) => g.id === "pokemon") && !/\s\d+$/.test(name);
  const [settled, jpSettled] = await Promise.all([
    Promise.allSettled(games.map((g) => searchTcgCards(g, name, perGame))),
    wantsPokemonJp ? searchPokemonJpCards(name, perGame).catch(() => []) : Promise.resolve([]),
  ]);

  const jpCards = jpSettled.map((c) => ({
    ...c,
    game: "pokemon",
    franchise: "Pokémon",
    imageUrl: `/api/img?url=${encodeURIComponent(c.imageUrl)}`,
  }));

  // "necrozma sm8b"       —
  const setQuery = parseJpSetQuery(name);
  if (
    setQuery &&
    jpCards.length > 0 &&
    jpCards.every((c) => c.setName?.toUpperCase() === setQuery.setCode)
  ) {
    return NextResponse.json({ cards: jpCards });
  }

  const cards = settled.flatMap((r, i) =>
    r.status === "fulfilled"
      ? r.value.map((c) => ({
          ...c,
          game: games[i].id,
          franchise: games[i].franchise,
          // CORP       .
          imageUrl: `/api/img?url=${encodeURIComponent(c.imageUrl)}`,
        }))
      : []
  );
  cards.push(...jpCards);

  // (     )
  if (cards.length === 0 && settled.every((r) => r.status === "rejected")) {
    const first = settled[0] as PromiseRejectedResult;
    return NextResponse.json(
      { error: first.reason instanceof Error ? first.reason.message : "unknown" },
      { status: 502 }
    );
  }
  return NextResponse.json({ cards });
}
