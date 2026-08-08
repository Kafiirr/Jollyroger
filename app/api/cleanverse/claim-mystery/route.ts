import { NextResponse } from "next/server";
import { searchTcgCards } from "@/lib/api/apitcg";
import { APITCG_GAMES } from "@/lib/api/apitcgGames";
import { listCollectibles, getCardDetail, searchRenaissCards } from "@/lib/api/renaiss";
import type { RenaissListedCard } from "@/lib/api/renaiss";
import { supabase } from "@/lib/supabase";
import { keccak256, toHex, createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CLEANVERSE_RWA_CARD_ABI, CLEANVERSE_RWA_CARD_ADDRESS } from "@/lib/contracts/CleanverseRWACardABI";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz/"] },
  },
});

const OP_KEYWORDS = [
  "Luffy", "Zoro", "Nami", "Law", "Ace", "Shanks",
  "Kaido", "Sanji", "Robin", "Yamato", "Enel", "Katakuri",
  "Buggy", "Whitebeard", "Doflamingo", "Crocodile", "Hancock", "Roger", "Uta"
];

const FALLBACK_MYSTERY_CARDS = [
  {
    name: "Monkey.D.Luffy [Gear 5 / OP05-119 SEC]",
    grade: "PSA 10 Gem Mint",
    franchise: "ONE PIECE TCG",
    priceUsd: 185.0,
    imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119.png",
    certNumber: "8849201",
    tokenId: "OP05-119-SEC",
  },
  {
    name: "Roronoa Zoro [Super Pre-Release / OP01-025 SR]",
    grade: "BGS 10 Pristine",
    franchise: "ONE PIECE TCG",
    priceUsd: 440.0,
    imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP01-025.png",
    certNumber: "9124853",
    tokenId: "OP01-025-SR",
  },
  {
    name: "Nami [Parallel Art / OP01-016 R]",
    grade: "PSA 10 Gem Mint",
    franchise: "ONE PIECE TCG",
    priceUsd: 295.0,
    imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP01-016_p1.png",
    certNumber: "7731940",
    tokenId: "OP01-016-PAR",
  },
  {
    name: "Trafalgar Law [Manga Alt Art / OP05-069 SR]",
    grade: "PSA 10 Gem Mint",
    franchise: "ONE PIECE TCG",
    priceUsd: 620.0,
    imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP05-069.png",
    certNumber: "6519284",
    tokenId: "OP05-069-SR",
  },
  {
    name: "Portgas.D.Ace [Super Parallel / OP02-013 SR]",
    grade: "BGS 9.5 Gem Mint",
    franchise: "ONE PIECE TCG",
    priceUsd: 780.0,
    imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP02-013.png",
    certNumber: "8402915",
    tokenId: "OP02-013-SR",
  },
  {
    name: "Shanks [Manga Secret Rare / OP01-120 SEC]",
    grade: "BGS 10 Black Label",
    franchise: "ONE PIECE TCG",
    priceUsd: 1150.0,
    imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP01-120.png",
    certNumber: "9948123",
    tokenId: "OP01-120-SEC",
  },
];

// GET: Check 24-hour rolling cooldown status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress") || "0xDemoWallet";
    const roomId = searchParams.get("roomId") || walletAddress;

    const activeWallet = walletAddress.toLowerCase();
    const activeRoom = roomId.toLowerCase();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from("daily_mystery_claims")
      .select("id, card_id, claimed_at")
      .or(`wallet_address.eq.${activeWallet},room_id.eq.${activeRoom}`)
      .gte("claimed_at", twentyFourHoursAgo)
      .order("claimed_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastClaimAt = new Date(data[0].claimed_at).getTime();
      const nextClaimAt = lastClaimAt + 24 * 60 * 60 * 1000;
      const remainingMs = Math.max(0, nextClaimAt - Date.now());

      return NextResponse.json({
        hasClaimedToday: remainingMs > 0,
        nextClaimAt: new Date(nextClaimAt).toISOString(),
        remainingSeconds: Math.ceil(remainingMs / 1000),
        lastClaimAt: data[0].claimed_at,
      });
    }

    return NextResponse.json({
      hasClaimedToday: false,
      remainingSeconds: 0,
    });
  } catch (err) {
    console.warn("Error querying 24-hour cooldown claims:", err);
    return NextResponse.json({ hasClaimedToday: false, remainingSeconds: 0 });
  }
}

// POST: Claim daily mystery card drop with 24-hour rolling cooldown enforcement
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, roomId, packType: requestedPack } = body;
    const activeWallet = walletAddress || "0xDemoWallet";
    const activeRoom = (roomId || activeWallet).toLowerCase();
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Enforce 24-hour rolling cooldown database check
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    try {
      const { data: recentClaims } = await supabase
        .from("daily_mystery_claims")
        .select("id, claimed_at")
        .or(`wallet_address.eq.${activeWallet.toLowerCase()},room_id.eq.${activeRoom}`)
        .gte("claimed_at", twentyFourHoursAgo)
        .order("claimed_at", { ascending: false })
        .limit(1);

      if (recentClaims && recentClaims.length > 0) {
        const lastClaimAt = new Date(recentClaims[0].claimed_at).getTime();
        const nextClaimAt = lastClaimAt + 24 * 60 * 60 * 1000;
        const remainingMs = Math.max(0, nextClaimAt - Date.now());

        if (remainingMs > 0) {
          const hours = Math.floor(remainingMs / (1000 * 60 * 60));
          const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          return NextResponse.json(
            { error: `24-Hour Cooldown Active! Next drop unlocks in ${hours}h ${mins}m.` },
            { status: 400 }
          );
        }
      }
    } catch (checkErr) {
      console.warn("24-hour claims check warning:", checkErr);
    }

    const isGold = requestedPack ? requestedPack === "gold" : Math.random() > 0.5;
    const packType = isGold ? "gold" : "silver";
    const packImage = isGold ? "/game/goldcard1.png" : "/game/silvercard1.png";

    let selectedCard: {
      name: string;
      grade: string;
      franchise: string;
      priceUsd: number;
      imageUrl: string;
      certNumber: string;
      tokenId: string;
    } | null = null;

    // 2. Primary Source: RenaissOS Protocol API
    try {
      const randomKeyword = OP_KEYWORDS[Math.floor(Math.random() * OP_KEYWORDS.length)];
      const searchCards = await searchRenaissCards({ game: "one-piece", q: randomKeyword, limit: 15 });
      if (searchCards && searchCards.length > 0) {
        const picked = searchCards[Math.floor(Math.random() * searchCards.length)];
        const price = picked.priceUsdCents ? picked.priceUsdCents / 100 : isGold ? 450 : 180;
        const img = picked.imageUrl || picked.imageUrlThumb || "";

        selectedCard = {
          name: picked.name,
          grade: picked.gradeLabel || picked.grade || (isGold ? "BGS 10 Pristine" : "PSA 10 Gem Mint"),
          franchise: "ONE PIECE TCG",
          priceUsd: price,
          imageUrl: img || `/api/img?url=${encodeURIComponent("https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119.png")}`,
          certNumber: Math.floor(1000000 + Math.random() * 9000000).toString(),
          tokenId: picked.id || `OP-MYSTERY-${Date.now()}`,
        };
      }
    } catch (renaissErr) {
      console.warn("RenaissOS search in mystery claim warning:", renaissErr);
    }

    // 3. Secondary Source: APITCG API
    if (!selectedCard) {
      try {
        const keyword = OP_KEYWORDS[Math.floor(Math.random() * OP_KEYWORDS.length)];
        const opGame = APITCG_GAMES.find((g) => g.id === "one-piece") || APITCG_GAMES[0];
        const apiCards = await searchTcgCards(opGame, keyword, 15);
        if (apiCards && apiCards.length > 0) {
          const picked = apiCards[Math.floor(Math.random() * apiCards.length)];
          const grades = isGold
            ? ["BGS 10 Pristine", "PSA 10 Gem Mint", "BGS 9.5 Black Label"]
            : ["PSA 9 Mint", "BGS 9.5 Gem Mint", "PSA 10 Gem Mint"];

          selectedCard = {
            name: picked.name,
            grade: grades[Math.floor(Math.random() * grades.length)],
            franchise: "ONE PIECE TCG",
            priceUsd: isGold ? Math.floor(320 + Math.random() * 680) : Math.floor(80 + Math.random() * 260),
            imageUrl: picked.imageUrl.startsWith("http") ? `/api/img?url=${encodeURIComponent(picked.imageUrl)}` : picked.imageUrl,
            certNumber: Math.floor(1000000 + Math.random() * 9000000).toString(),
            tokenId: picked.id || `OP-MYSTERY-${Date.now()}`,
          };
        }
      } catch (e) {
        console.warn("APITCG fetch in mystery claim warning:", e);
      }
    }

    // 4. Fallback with randomized curated card selection
    if (!selectedCard) {
      const pickedFallback = FALLBACK_MYSTERY_CARDS[Math.floor(Math.random() * FALLBACK_MYSTERY_CARDS.length)];
      selectedCard = {
        ...pickedFallback,
        certNumber: Math.floor(1000000 + Math.random() * 9000000).toString(),
        tokenId: `OP-MYSTERY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
    }

    const acquiredAt = new Date().toISOString().slice(0, 10).replaceAll("-", ".");
    const cvaAssetId = `cva_${selectedCard.tokenId.slice(0, 8)}_${Date.now()}`;
    const traceabilityHash = keccak256(
      toHex(`${cvaAssetId}:${selectedCard.name}:${selectedCard.certNumber}:${activeWallet}:${Date.now()}`)
    );

    // 4.5. On-chain Mint (Seamless)
    const privateKey = process.env.MONAD_PRIVATE_KEY;
    if (privateKey) {
      try {
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
        const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http() });

        const txHash = await walletClient.writeContract({
          address: CLEANVERSE_RWA_CARD_ADDRESS,
          abi: CLEANVERSE_RWA_CARD_ABI,
          functionName: "mintRWACard",
          args: [
            activeWallet as `0x${string}`,
            selectedCard.imageUrl,
            cvaAssetId,
            traceabilityHash as `0x${string}`,
          ] as const,
        });

        if (txHash !== "0x") {
          await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        }
      } catch (mintErr) {
        console.error("Seamless minting failed in backend:", mintErr);
      }
    }

    // 5. Insert into Supabase showcase_cards table
    let insertedId = `p${Date.now()}`;
    try {
      const { data } = await supabase
        .from("showcase_cards")
        .insert({
          name: selectedCard.name,
          grade: selectedCard.grade,
          franchise: selectedCard.franchise,
          image_url: selectedCard.imageUrl,
          acquired_at: acquiredAt,
          origin: "onchain",
          token_id: selectedCard.tokenId,
          room_id: activeRoom,
          wallet_address: activeWallet.toLowerCase(),
        })
        .select("id")
        .single();
      if (data) insertedId = (data as { id: string }).id;
    } catch (dbErr) {
      console.warn("Supabase insert mystery card warning:", dbErr);
    }

    // 6. Record Daily Claim in daily_mystery_claims table
    try {
      await supabase.from("daily_mystery_claims").insert({
        wallet_address: activeWallet.toLowerCase(),
        room_id: activeRoom,
        claim_date: todayStr,
        card_id: insertedId,
      });
    } catch (claimDbErr) {
      console.warn("Supabase insert daily_mystery_claims warning:", claimDbErr);
    }

    return NextResponse.json({
      success: true,
      packType,
      packImage,
      card: {
        id: insertedId,
        name: selectedCard.name,
        grade: selectedCard.grade,
        franchise: selectedCard.franchise,
        priceUsd: selectedCard.priceUsd,
        imageUrl: selectedCard.imageUrl,
        cvaAssetId,
        traceabilityHash,
        acquiredAt,
        packType,
        packImage,
      },
    });
  } catch (err) {
    console.error("Claim mystery card error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to claim mystery card" },
      { status: 500 }
    );
  }
}
