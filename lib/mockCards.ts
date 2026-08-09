export interface CardEntry {
  id: string;
  name: string;
  grade: string;       // "PSA 10"
  franchise: "Pokémon" | "One Piece";
  emoji: string;       //
  tint: string;
  priceUsd: number;
  delta30d: number;    // %
  acquiredAt: string;  // YYYY.MM.DD
  source: "onchain" | "redeemed";
}

export const fmtUsd = (n: number) => "$" + (n || 0).toLocaleString();
