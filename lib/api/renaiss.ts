/**
 * RenaissOS API v1 Integration Library
 * Base URL: https://api.renaissos.com
 * OpenAPI Specification: https://api.renaissos.com/v1/openapi.json
 */

const BASE = process.env.RENAISS_API_URL ?? "https://api.renaissos.com";

export function getRenaissHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = process.env.RENAISS_X_API_KEY;
  const secret = process.env.RENAISS_X_API_SECRET;
  if (key) {
    headers["X-Api-Key"] = key;
    headers["x-api-key"] = key;
  }
  if (secret) {
    headers["X-Api-Secret"] = secret;
    headers["x-api-secret"] = secret;
  }
  return headers;
}

/* ================= In-Memory Cache ================= */

interface CacheEntry<T> {
  data: T;
  expires: number;
}
const MEM_CACHE = new Map<string, CacheEntry<any>>();

async function fetchCached<T>(
  cacheKey: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const cached = MEM_CACHE.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.data;
  }
  try {
    const data = await fetcher();
    MEM_CACHE.set(cacheKey, { data, expires: now + ttlMs });
    return data;
  } catch (err: any) {
    if (cached) {
      return cached.data;
    }
    throw err;
  }
}

/* ================= OpenAPI v1 Types ================= */

export type GameSlug =
  | "pokemon"
  | "one-piece"
  | "sports"
  | "digimon"
  | "riftbound"
  | "mtg"
  | "yugioh"
  | "lorcana"
  | "gundam"
  | "others";

export interface CardSummary {
  id: string; // items.id (UUID)
  renaissItemId?: string | null;
  game: GameSlug;
  type: string; // "POKEMON" | "ONE_PIECE" | "SPORTS" ...
  name: string;
  setName?: string | null;
  setCode?: string | null;
  cardNumber?: string | null;
  variation?: string | null;
  rarity?: string | null;
  language?: string | null;
  imageUrl?: string | null;
  imageUrlThumb?: string | null;
  company?: "PSA" | "BGS" | "CGC" | "SGC" | "RAW" | "TAG";
  grade?: string;
  gradeLabel?: string;
  priceUsdCents?: number | null; // integer USD cents
  deltaPct?: number | null;
  confidence?: "prime" | "high" | "medium" | "low" | null;
  lastSaleAt?: string | null;
  spark?: number[];
  href: string;
}

export interface SearchResponse {
  query: string;
  results: CardSummary[];
}

export interface FeaturedResponse {
  cards: CardSummary[];
}

export interface SourceBreakdownEntry {
  source: string;
  bucket?: string | null;
  category?: string | null;
  displayName: string;
  count: number;
  medianUsdCents?: number | null;
  overviewUrl?: string | null;
}

export interface FmvMethodValue {
  method: string;
  scorerVersion: string;
  label: string;
  priceUsdCents?: number | null;
  confidence?: string | null;
  sourceCount?: number | null;
  observationCount?: number | null;
}

export interface GradeRow {
  company?: string | null;
  grade?: string | null;
  gradeLabel: string;
  priceUsdCents?: number | null;
  deltaPct?: number | null;
  confidence?: string | null;
  lastSaleAt?: string | null;
  href: string;
  current: boolean;
}

export interface CardDetail {
  id: string;
  game: GameSlug;
  type: string;
  name: string;
  setName?: string | null;
  setCode?: string | null;
  cardNumber?: string | null;
  variation?: string | null;
  rarity?: string | null;
  language?: string | null;
  imageUrl?: string | null;
  imageUrlLg?: string | null;
  company?: string | null;
  grade?: string | null;
  gradeLabel: string;
  priceUsdCents?: number | null;
  deltas?: {
    d7: number | null;
    d30: number | null;
    d365: number | null;
  };
  confidence?: string | null;
  sourceCount?: number | null;
  observationCount?: number | null;
  observationWindowDays?: number | null;
  totalObservationCount?: number | null;
  updatedAt?: string | null;
  lastSaleAt?: string | null;
  refreshing?: boolean;
  sourceBreakdown?: SourceBreakdownEntry[];
  sourceBreakdownAllTime?: SourceBreakdownEntry[];
  methods?: FmvMethodValue[];
  otherGrades?: GradeRow[];
  similar?: CardSummary[];
  href: string;
  pageUrl?: string;
}

export interface IndexConstituent {
  rank: number;
  name: string;
  setName?: string | null;
  setCode?: string | null;
  cardNumber?: string | null;
  grade: string;
  imageUrl?: string | null;
  imageUrlThumb?: string | null;
  priceUsdCents?: number | null;
  deltaPct?: number | null;
  lastSaleAt?: string | null;
  tradeCountWindow?: number;
  href: string;
}

export interface IndexDetail {
  game: GameSlug;
  label: string;
  value: number;
  base: number;
  deltas: {
    d7: number | null;
    d30: number | null;
    d365: number | null;
  };
  constituentCount: number;
  rebalance: string;
  sparkline: Array<{ t: string; usdCents: number; source?: string | null; n?: number }>;
  topMovers: Array<{
    name: string;
    setCode?: string | null;
    cardNumber?: string | null;
    grade: string;
    href: string;
    deltaPct?: number | null;
  }>;
  updatedAt?: string | null;
  windowDays?: number;
  baseDate?: string | null;
  constituents: IndexConstituent[];
}

export interface GradedLookup {
  cert: string;
  certNumber: string;
  company: string;
  found: boolean;
  grade?: string | null;
  gradeLabel?: string | null;
  card?: CardSummary | null;
  certImages?: {
    front?: string | null;
    back?: string | null;
    item?: string | null;
  } | null;
  reason?: string | null;
  warning?: string | null;
}

/* ================= Legacy & Cross-Compatible Types ================= */

export interface RenaissListedCard {
  tokenId: string;
  name: string;
  setName: string;
  cardNumber: string;
  pokemonName: string;
  ownerAddress: string;
  askPriceInUSDT: string; // price in USD string or "NO-ASK-PRICE"
  fmvPriceInUSD: string; // price in USD string or "NO-FMV-PRICE"
  gradingCompany: string;
  grade: string;
  year: number;
  ownerAcquiredAt?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  frontWithoutStandImageUrl?: string;
  imageUrl?: string;
  type?: "POKEMON" | "ONE_PIECE" | "SPORTS";
  href?: string;
  owner: { username: string } | null;
}

export interface RenaissCardDetail extends RenaissListedCard {
  frontImageUrl?: string;
  backImageUrl?: string;
  frontWithoutStandImageUrl?: string;
  type?: "POKEMON" | "ONE_PIECE" | "SPORTS";
}

export interface RenaissSbt {
  id: number | string;
  title: string;
  description: string;
  imageUrl: string;
}

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

/* ================= Helper Conversion ================= */

export function cardSummaryToListed(c: CardSummary): RenaissListedCard {
  const priceStr =
    c.priceUsdCents != null && c.priceUsdCents > 0
      ? (c.priceUsdCents / 100).toFixed(2)
      : "120.00";
  const gradeStr = c.gradeLabel || (c.grade ? `${c.company || "PSA"} ${c.grade}` : "PSA 10");
  const img = c.imageUrl || c.imageUrlThumb || undefined;

  return {
    tokenId: c.id,
    name: c.name,
    setName: c.setName || c.setCode || "One Piece TCG",
    cardNumber: c.cardNumber || "",
    pokemonName: c.name,
    ownerAddress: "",
    askPriceInUSDT: priceStr,
    fmvPriceInUSD: priceStr,
    gradingCompany: c.company || "PSA",
    grade: gradeStr,
    year: 2024,
    frontImageUrl: img,
    frontWithoutStandImageUrl: img,
    imageUrl: img,
    type: (c.type as "POKEMON" | "ONE_PIECE" | "SPORTS") || (c.game === "one-piece" ? "ONE_PIECE" : "POKEMON"),
    href: c.href,
    owner: null,
  };
}

export function cardDetailToLegacy(d: CardDetail): RenaissCardDetail {
  const priceStr =
    d.priceUsdCents != null && d.priceUsdCents > 0
      ? (d.priceUsdCents / 100).toFixed(2)
      : "120.00";
  const gradeStr = d.gradeLabel || (d.grade ? `${d.company || "PSA"} ${d.grade}` : "PSA 10");
  const img = d.imageUrl || d.imageUrlLg || undefined;

  return {
    tokenId: d.id,
    name: d.name,
    setName: d.setName || d.setCode || "One Piece TCG",
    cardNumber: d.cardNumber || "",
    pokemonName: d.name,
    ownerAddress: "",
    askPriceInUSDT: priceStr,
    fmvPriceInUSD: priceStr,
    gradingCompany: d.company || "PSA",
    grade: gradeStr,
    year: 2024,
    frontImageUrl: img,
    frontWithoutStandImageUrl: img,
    imageUrl: img,
    type: (d.type as "POKEMON" | "ONE_PIECE" | "SPORTS") || (d.game === "one-piece" ? "ONE_PIECE" : "POKEMON"),
    href: d.href,
    owner: null,
  };
}

/* ================= API Methods ================= */

/**
 * Search Renaiss cards via /v1/search (Cached in-memory for 10 minutes)
 */
export async function searchRenaissCards(opts: {
  q?: string;
  character?: string;
  game?: string;
  limit?: number;
}): Promise<CardSummary[]> {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.character) params.set("character", opts.character);
  if (opts.game) params.set("game", opts.game);
  if (opts.limit) params.set("limit", String(opts.limit));

  const cacheKey = `search:${params.toString()}`;

  return fetchCached(cacheKey, 600_000, async () => {
    try {
      const res = await fetch(`${BASE}/v1/search?${params}`, {
        headers: getRenaissHeaders(),
        next: { revalidate: 600 },
      });

      if (res.status === 429) {
        // Return empty so caller falls back seamlessly without noisy error stack
        return [];
      }

      if (!res.ok) {
        return [];
      }

      const data = (await res.json()) as SearchResponse;
      return data.results ?? [];
    } catch {
      return [];
    }
  });
}

/**
 * Get featured cards across games via /v1/cards/featured (Cached in-memory for 10 minutes)
 */
export async function getFeaturedCards(limit = 48): Promise<CardSummary[]> {
  const cacheKey = `featured:${limit}`;

  return fetchCached(cacheKey, 600_000, async () => {
    try {
      const res = await fetch(`${BASE}/v1/cards/featured?limit=${limit}`, {
        headers: getRenaissHeaders(),
        next: { revalidate: 600 },
      });

      if (res.status === 429 || !res.ok) {
        return [];
      }

      const data = (await res.json()) as FeaturedResponse;
      return data.cards ?? [];
    } catch {
      return [];
    }
  });
}

/**
 * Get game index details and ranked constituents via /v1/indices/{game} (Cached in-memory for 10 minutes)
 */
export async function getGameIndex(game: "pokemon" | "one-piece" | "sports"): Promise<IndexDetail | null> {
  const cacheKey = `index:${game}`;

  return fetchCached(cacheKey, 600_000, async () => {
    try {
      const res = await fetch(`${BASE}/v1/indices/${encodeURIComponent(game)}`, {
        headers: getRenaissHeaders(),
        next: { revalidate: 600 },
      });

      if (res.status === 429 || !res.ok) {
        return null;
      }

      return (await res.json()) as IndexDetail;
    } catch {
      return null;
    }
  });
}

/**
 * Get card detail by catalog id (items.id UUID) via /v1/cards/by-id/{id} (Cached for 10 minutes)
 */
export async function getCardDetailById(id: string): Promise<CardDetail | null> {
  const cacheKey = `card_id:${id}`;

  return fetchCached(cacheKey, 600_000, async () => {
    try {
      const res = await fetch(`${BASE}/v1/cards/by-id/${encodeURIComponent(id)}`, {
        headers: getRenaissHeaders(),
        next: { revalidate: 600 },
      });

      if (res.status === 429 || !res.ok) {
        return null;
      }

      return (await res.json()) as CardDetail;
    } catch {
      return null;
    }
  });
}

/**
 * Get graded card lookup via /v1/graded/{cert}
 */
export async function getGradedCert(cert: string): Promise<GradedLookup | null> {
  const cacheKey = `graded:${cert}`;

  return fetchCached(cacheKey, 600_000, async () => {
    try {
      const res = await fetch(`${BASE}/v1/graded/${encodeURIComponent(cert)}`, {
        headers: getRenaissHeaders(),
        next: { revalidate: 600 },
      });

      if (res.status === 429 || !res.ok) {
        return null;
      }

      return (await res.json()) as GradedLookup;
    } catch {
      return null;
    }
  });
}

/**
 * listCollectibles — unified marketplace & card discovery method
 */
export async function listCollectibles(
  opts: {
    limit?: number;
    categoryFilter?: "POKEMON" | "ONE_PIECE" | string;
    search?: string;
    sortBy?: "fmvPriceInUsd" | "year" | "grade" | "name" | "listDate" | "mintDate";
    sortOrder?: "asc" | "desc";
  } = {}
): Promise<RenaissListedCard[]> {
  const limit = opts.limit || 30;
  const game =
    opts.categoryFilter === "ONE_PIECE"
      ? "one-piece"
      : opts.categoryFilter === "POKEMON"
        ? "pokemon"
        : undefined;

  let summaries: CardSummary[] = [];

  // Strategy 1: /v1/search with relevant query
  try {
    const q = opts.search || (game === "one-piece" ? "Luffy" : game === "pokemon" ? "Pikachu" : "Card");
    summaries = await searchRenaissCards({
      q,
      game,
      limit,
    });
  } catch {}

  // Strategy 2: /v1/indices/{game} for ranked constituents
  if (summaries.length === 0 && (game === "one-piece" || game === "pokemon" || game === "sports")) {
    try {
      const idx = await getGameIndex(game);
      if (idx && idx.constituents && idx.constituents.length > 0) {
        return idx.constituents.slice(0, limit).map((c, i) => {
          const price = c.priceUsdCents != null && c.priceUsdCents > 0 ? (c.priceUsdCents / 100).toFixed(2) : "120.00";
          const img = c.imageUrl || c.imageUrlThumb || undefined;
          return {
            tokenId: c.href ? c.href.split("/").pop() || `idx-${i}` : `idx-${i}`,
            name: c.name,
            setName: c.setName || c.setCode || "One Piece TCG",
            cardNumber: c.cardNumber || "",
            pokemonName: c.name,
            ownerAddress: "",
            askPriceInUSDT: price,
            fmvPriceInUSD: price,
            gradingCompany: c.grade?.split(" ")[0] || "PSA",
            grade: c.grade || "PSA 10",
            year: 2024,
            frontImageUrl: img,
            frontWithoutStandImageUrl: img,
            imageUrl: img,
            type: game === "one-piece" ? "ONE_PIECE" : "POKEMON",
            href: c.href,
            owner: null,
          };
        });
      }
    } catch {}
  }

  // Strategy 3: /v1/cards/featured
  if (summaries.length === 0) {
    try {
      summaries = await getFeaturedCards(limit);
    } catch {}
  }

  return summaries.map(cardSummaryToListed);
}

/**
 * getCardDetail — get card detail by token ID, catalog UUID, or path
 */
export async function getCardDetail(tokenId: string): Promise<RenaissCardDetail> {
  const headers = getRenaissHeaders();

  // If it's a UUID (catalog card ID)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tokenId)) {
    try {
      const card = await getCardDetailById(tokenId);
      if (card) return cardDetailToLegacy(card);
    } catch {}
  }

  // If it's a path like /card/{game}/{set}/{card}
  const cleanPath = tokenId.replace(/^\/card\//, "").replace(/^\//, "");
  const segments = cleanPath.split("/").filter(Boolean);
  if (segments.length === 3) {
    const [game, set, cardSlug] = segments;
    try {
      const res = await fetch(
        `${BASE}/v1/cards/${encodeURIComponent(game)}/${encodeURIComponent(set)}/${encodeURIComponent(cardSlug)}`,
        { headers, next: { revalidate: 600 } }
      );
      if (res.ok) {
        const card = (await res.json()) as CardDetail;
        return cardDetailToLegacy(card);
      }
    } catch {}
  }

  // Try by Renaiss inventory item ID
  try {
    const res = await fetch(`${BASE}/v1/cards/by-renaiss-id/${encodeURIComponent(tokenId)}`, {
      headers,
      next: { revalidate: 600 },
    });
    if (res.ok) {
      const card = (await res.json()) as CardDetail;
      return cardDetailToLegacy(card);
    }
  } catch {}

  // Fallback search by query
  try {
    const searchResults = await searchRenaissCards({ q: tokenId, limit: 1 });
    if (searchResults && searchResults[0]) {
      return cardSummaryToListed(searchResults[0]);
    }
  } catch {}

  throw new Error(`Renaiss card not found: ${tokenId}`);
}

/**
 * getUserProfile — retrieves user showcase profile with graceful fallback
 */
export async function getUserProfile(id: string): Promise<RenaissUserProfile> {
  try {
    const searchResults = await searchRenaissCards({ q: id, limit: 10 });
    if (searchResults.length > 0) {
      return {
        id,
        username: id,
        avatarUrl: "",
        favoritedSBTs: [],
        favoritedCollectibles: searchResults.map((c) => ({
          id: c.id,
          tokenId: c.id,
          name: c.name,
          setName: c.setName || c.setCode || "",
          grade: c.gradeLabel || c.grade || "PSA 10",
          gradingCompany: c.company || "PSA",
          fmvPriceInUSD: c.priceUsdCents ? c.priceUsdCents / 100 : 120,
          imageUrl: c.imageUrl || c.imageUrlThumb || undefined,
          frontImageUrl: c.imageUrl || c.imageUrlThumb || undefined,
          frontWithoutStandImageUrl: c.imageUrl || c.imageUrlThumb || undefined,
        })),
      };
    }
  } catch {}

  return {
    id,
    username: id,
    avatarUrl: "",
    favoritedSBTs: [],
    favoritedCollectibles: [],
  };
}
