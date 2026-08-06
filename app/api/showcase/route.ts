import { NextResponse } from "next/server";
import { getCardDetail, getUserProfile } from "@/lib/api/renaiss";

/**
*    — Renaiss   " "(favoritedCollectibles).
*       ( favoritedSBTs   ). env RENAISS_SHOWCASE_USER.
*  - ?ids=1,2,3 :  tokenId    —   "ID  "
* ⚠️    8  ,       .
*     API "  "  ( owner  ).  ID    .
*    →   (  ) .
 */
export interface ShowcaseCardDto {
  tokenId: string;
  name: string;
  setName: string;
  grade: string;
  franchise: string;
  year: number;
  priceUsd?: number;
  acquiredAt?: string;
  imageUrl?: string;
}

export const revalidate = 300;

const FRANCHISE_LABEL: Record<string, string> = {
  POKEMON: "Pokémon",
  ONE_PIECE: "One Piece",
  SPORTS: "Sports",
};

/**   ($) — (ask, Buy Now) , ("NO-ASK-PRICE" ) FMV .
*   : askPriceInUSDT USDT 18(wei) → ÷1e18, fmvPriceInUSD  → ÷100. */
function pickOnchainPrice(ask?: string, fmv?: string): number | undefined {
  const a = Number(ask);
  if (Number.isFinite(a) && a > 0) return Math.round((a / 1e18) * 100) / 100;
  const f = Number(fmv);
  return Number.isFinite(f) && f > 0 ? Math.round(f) / 100 : undefined;
}

export async function GET(req: Request) {
  // ID   —     (: ?ids=123  ?ids=1,2,3)
  const ids = new URL(req.url).searchParams
    .get("ids")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids && ids.length > 0) {
    const settled = await Promise.allSettled(ids.slice(0, 10).map((id) => getCardDetail(id)));
    const cards: ShowcaseCardDto[] = settled.flatMap((r) =>
      r.status === "fulfilled"
        ? [
            {
              tokenId: r.value.tokenId,
              name: r.value.name,
              setName: r.value.setName,
              grade: [r.value.gradingCompany, r.value.grade].filter(Boolean).join(" ").trim(),
              franchise: (r.value.type && FRANCHISE_LABEL[r.value.type]) || r.value.setName || "",
              year: r.value.year,
              // = (Buy Now, askPriceInUSDT) . ("NO-ASK-PRICE") FMV .
              priceUsd: pickOnchainPrice(r.value.askPriceInUSDT, r.value.fmvPriceInUSD),
              acquiredAt: r.value.ownerAcquiredAt?.slice(0, 10).replaceAll("-", "."),
              imageUrl: r.value.frontWithoutStandImageUrl ?? r.value.frontImageUrl,
            },
          ]
        : []
    );
    // ( tokenId ) 404 —  "  "
    if (cards.length === 0) return NextResponse.json({ cards: [] }, { status: 404 });
    return NextResponse.json({ cards, source: "ids" });
  }

  const user =
    new URL(req.url).searchParams.get("user")?.trim() || process.env.RENAISS_SHOWCASE_USER;
  if (!user) return NextResponse.json({ cards: [] });

  // Handle EVM Wallet Address (0x...) or local room IDs (e.g. "home") -> Query Supabase DB showcase_cards table
  if (user.toLowerCase().startsWith("0x") || user.toLowerCase() === "home" || !user.includes(".")) {
    try {
      const { supabase } = await import("@/lib/supabase");
      const target = user.toLowerCase();
      const { data } = await supabase
        .from("showcase_cards")
        .select("*")
        .or(`room_id.eq.${target},wallet_address.eq.${target},room_id.eq.home,wallet_address.eq.home`)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const cards: ShowcaseCardDto[] = data.map((c, i) => ({
          tokenId: c.token_id ?? c.id ?? String(i),
          name: c.name ?? "Collectible Card",
          setName: c.franchise ?? "",
          grade: c.grade ?? "GRADED",
          franchise: c.franchise ?? "",
          year: 0,
          imageUrl: c.image_url ?? undefined,
          acquiredAt: c.acquired_at ?? "",
        }));
        return NextResponse.json({ cards, source: "supabase" });
      }
      return NextResponse.json({ cards: [] });
    } catch (err) {
      console.warn("Showcase API Supabase error:", err);
      return NextResponse.json({ cards: [] });
    }
  }

  try {
    const profile = await getUserProfile(user);
    const cards: ShowcaseCardDto[] = profile.favoritedCollectibles
      .map((c, i) => {
        const fmv = Number(c.fmvPriceInUSD);
        return {
          tokenId: String(c.tokenId ?? c.id ?? i),
          name: c.name ?? c.title ?? "Untitled card",
          setName: c.setName ?? "",
          grade: [c.gradingCompany, c.grade].filter(Boolean).join(" ").trim(),
          franchise: c.setName ?? "",
          year: 0,
          priceUsd: Number.isFinite(fmv) ? fmv : undefined,
          imageUrl: c.frontWithoutStandImageUrl ?? c.frontImageUrl ?? c.imageUrl,
        };
      })
      .filter((c) => c.imageUrl || c.name !== "Untitled card");
    return NextResponse.json({ cards, source: "showcase" });
  } catch (e) {
    return NextResponse.json(
      { cards: [], error: e instanceof Error ? e.message : "unknown" },
      { status: 502 }
    );
  }
}
