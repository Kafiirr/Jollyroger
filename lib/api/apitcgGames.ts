/**
* apitcg.com  TCG  —      .
 * 새 게임 추가 = 여기 한 줄 (id는 apitcg URL 경로: https:// www.apitcg.com/api/<id>/cards).
* ( ) ( · )  —    .
 */
export interface ApiTcgGame {
/** apitcg API   (: "one-piece", "pokemon") */
  id: string;
/** UI   */
  label: string;
/**   franchise     */
  franchise: string;
/**      —  (/api/img)    */
  imageHosts: string[];
/**    (OP01-016) +   (_pN)    */
  codeSearch?: boolean;
}

export const APITCG_GAMES: ApiTcgGame[] = [
  {
    id: "one-piece",
    label: "One Piece",
    franchise: "One Piece",
    imageHosts: [
      "en.onepiece-cardgame.com",
      "asia-en.onepiece-cardgame.com",
      "www.onepiece-cardgame.com", // — JP
      "onepiece-cardgame.com",
    ],
    codeSearch: true,
  },
  {
    id: "pokemon",
    label: "Pokémon",
    franchise: "Pokémon",
    // www.pokemon-card.com =   DB (lib/api/pokemonJp.ts   )
    // cdn.malie.io =  (SV ~)  CDN — apitcg
    imageHosts: ["images.pokemontcg.io", "www.pokemon-card.com", "cdn.malie.io"],
  },
  {
    id: "digimon",
    label: "Digimon",
    franchise: "Digimon",
    imageHosts: ["images.digimoncard.io", "world.digimoncard.com", "en.digimoncard.com"],
  },
  {
    id: "dragon-ball-fusion",
    label: "Dragon Ball",
    franchise: "Dragon Ball",
    imageHosts: ["www.dbs-cardgame.com"],
  },
  {
    id: "union-arena",
    label: "Union Arena",
    franchise: "Union Arena",
    imageHosts: ["www.unionarena-tcg.com"],
  },
  { id: "gundam", label: "Gundam", franchise: "Gundam", imageHosts: ["www.gundam-gcg.com"] },
];

export function findGame(id: string | null | undefined): ApiTcgGame | undefined {
  return APITCG_GAMES.find((g) => g.id === id);
}
