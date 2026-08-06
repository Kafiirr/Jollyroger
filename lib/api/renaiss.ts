/**
* Renaiss  API  (read-only,  )
 * 공식 npm CLI 'renaiss'가 사용하는 공개 엔드포인트 — https:// api.renaiss.xyz
*  : renaiss@0.0.3-beta.2  openapi   (github.com/Renaiss-Protocol/renaiss-cli)
*     (/v0/cards/{tokenId})  →    N .
 */
const BASE = process.env.RENAISS_API_URL ?? "https://api.renaiss.xyz";

function getRenaissHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.RENAISS_X_API_KEY) {
    headers["x-api-key"] = process.env.RENAISS_X_API_KEY;
    headers["X-API-KEY"] = process.env.RENAISS_X_API_KEY;
  }
  if (process.env.RENAISS_X_API_SECRET) {
    headers["x-api-secret"] = process.env.RENAISS_X_API_SECRET;
    headers["X-API-SECRET"] = process.env.RENAISS_X_API_SECRET;
  }
  return headers;
}

export interface RenaissListedCard {
  tokenId: string;
  name: string;
  setName: string;
  cardNumber: string;
  pokemonName: string;
  ownerAddress: string;
  askPriceInUSDT: string; // "NO-ASK-PRICE"
  fmvPriceInUSD: string; // "NO-FMV-PRICE"
  gradingCompany: string;
  grade: string;
  year: number;
  ownerAcquiredAt?: string;
  owner: { username: string } | null;
}

export interface RenaissCardDetail extends RenaissListedCard {
  frontImageUrl?: string;
  backImageUrl?: string;
  frontWithoutStandImageUrl?: string;
  type?: "POKEMON" | "ONE_PIECE" | "SPORTS";
}

export async function listCollectibles(
  opts: {
    limit?: number;
    categoryFilter?: "POKEMON" | "ONE_PIECE";
    search?: string;
    sortBy?: "fmvPriceInUsd" | "year" | "grade" | "name" | "listDate" | "mintDate";
    sortOrder?: "asc" | "desc";
  } = {}
): Promise<RenaissListedCard[]> {
  const q = new URLSearchParams();
  if (opts.limit) q.set("limit", String(opts.limit));
  if (opts.categoryFilter) q.set("categoryFilter", opts.categoryFilter);
  if (opts.search) q.set("search", opts.search);
  if (opts.sortBy) q.set("sortBy", opts.sortBy);
  if (opts.sortOrder) q.set("sortOrder", opts.sortOrder);

  const res = await fetch(`${BASE}/v0/marketplace?${q}`, {
    headers: getRenaissHeaders(),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Renaiss API ${res.status}`);
  const data = (await res.json()) as { collection: RenaissListedCard[] };
  return data.collection ?? [];
}

export async function getCardDetail(tokenId: string): Promise<RenaissCardDetail> {
  const res = await fetch(`${BASE}/v0/cards/${encodeURIComponent(tokenId)}`, {
    headers: getRenaissHeaders(),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Renaiss API ${res.status}`);
  const data = (await res.json()) as { collectible: RenaissCardDetail };
  return data.collectible;
}

/** SBT  —   favoritedSBTs (     ) */
export interface RenaissSbt {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
}

/** ()  —      .  (   ) */
export interface RenaissFavoritedCollectible {
  id?: number | string;
  tokenId?: string;
  title?: string;
  name?: string;
  setName?: string;
  grade?: string;
  gradingCompany?: string;
  fmvPriceInUSD?: string | number;
  imageUrl?: string;
  frontImageUrl?: string;
  frontWithoutStandImageUrl?: string;
}

export interface RenaissUserProfile {
  id: string;
  username: string;
  avatarUrl: string;
  favoritedSBTs: RenaissSbt[];
  favoritedCollectibles: RenaissFavoritedCollectible[];
}

/**     (GET /v0/users/{id}) — SBT  +   + . id = username  uuid */
export async function getUserProfile(id: string): Promise<RenaissUserProfile> {
  const res = await fetch(`${BASE}/v0/users/${encodeURIComponent(id)}`, {
    headers: getRenaissHeaders(),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Renaiss API ${res.status}`);
  const data = (await res.json()) as RenaissUserProfile;
  return {
    ...data,
    favoritedSBTs: data.favoritedSBTs ?? [],
    favoritedCollectibles: data.favoritedCollectibles ?? [],
  };
}
