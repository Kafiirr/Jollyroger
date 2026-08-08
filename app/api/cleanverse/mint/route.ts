import { NextResponse } from "next/server";
import { listCollectibles, getCardDetail, searchRenaissCards } from "@/lib/api/renaiss";
import type { RenaissListedCard } from "@/lib/api/renaiss";
import { searchTcgCards } from "@/lib/api/apitcg";
import { APITCG_GAMES } from "@/lib/api/apitcgGames";
import { keccak256, toHex, createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CLEANVERSE_RWA_CARD_ABI } from "@/lib/contracts/CleanverseRWACardABI";

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
  "Kaido", "Sanji", "Robin", "Yamato", "Katakuri", "Whitebeard", "Hancock"
];

const FALLBACK_ONE_PIECE_CARDS = [
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
  {
    name: "Kaido [Leader Parallel / OP01-061 L]",
    grade: "PSA 10 Gem Mint",
    franchise: "ONE PIECE TCG",
    priceUsd: 145.0,
    imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP01-061.png",
    certNumber: "5519827",
    tokenId: "OP01-061-L",
  },
  {
    name: "Sanji [Parallel Art / OP04-104 SR]",
    grade: "PSA 10 Gem Mint",
    franchise: "ONE PIECE TCG",
    priceUsd: 160.0,
    imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP04-104.png",
    certNumber: "7201948",
    tokenId: "OP04-104-SR",
  },
  {
    name: "Yamato [Secret Rare Parallel / OP01-121 SEC]",
    grade: "BGS 10 Pristine",
    franchise: "ONE PIECE TCG",
    priceUsd: 520.0,
    imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP01-121.png",
    certNumber: "8831094",
    tokenId: "OP01-121-SEC",
  },
  {
    name: "Edward.Newgate [Whitebeard Leader / OP02-001 L]",
    grade: "PSA 10 Gem Mint",
    franchise: "ONE PIECE TCG",
    priceUsd: 210.0,
    imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP02-001.png",
    certNumber: "6629104",
    tokenId: "OP02-001-L",
  },
  {
    name: "Boa Hancock [Parallel Art / OP07-051 SR]",
    grade: "PSA 10 Gem Mint",
    franchise: "ONE PIECE TCG",
    priceUsd: 340.0,
    imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP07-051.png",
    certNumber: "9318274",
    tokenId: "OP07-051-SR",
  },
  {
    name: "Charlotte Katakuri [Secret Rare / OP03-123 SEC]",
    grade: "BGS 9.5 Gem Mint",
    franchise: "ONE PIECE TCG",
    priceUsd: 230.0,
    imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP03-123.png",
    certNumber: "8104729",
    tokenId: "OP03-123-SEC",
  },
];

/**
 * POST /api/cleanverse/mint
 *
 * Prepare & on-chain batch mint endpoint: selects distinct high-value cards
 * and generates on-chain mint parameters on Monad Testnet.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, roomId, score, count } = body;

    const cardsEarnedCount = count ? Math.max(1, Math.min(10, count)) : Math.max(1, Math.floor((score || 0) / 5));

    // Fetch RenaissOS Protocol One Piece cards
    let renaissList: RenaissListedCard[] = [];
    try {
      renaissList = (await listCollectibles({ categoryFilter: "ONE_PIECE", limit: 40 })) || [];
      if (renaissList.length === 0) {
        const searchResults = await searchRenaissCards({ game: "one-piece", q: "Luffy", limit: 30 });
        if (searchResults.length > 0) {
          renaissList = searchResults.map((c) => ({
            tokenId: c.id,
            name: c.name,
            setName: c.setName || c.setCode || "One Piece TCG",
            cardNumber: c.cardNumber || "",
            pokemonName: c.name,
            ownerAddress: "",
            askPriceInUSDT: c.priceUsdCents ? String(c.priceUsdCents / 100) : "120",
            fmvPriceInUSD: c.priceUsdCents ? String(c.priceUsdCents / 100) : "120",
            gradingCompany: c.company || "PSA",
            grade: c.gradeLabel || c.grade || "PSA 10",
            year: 2024,
            frontImageUrl: c.imageUrl || c.imageUrlThumb || undefined,
            frontWithoutStandImageUrl: c.imageUrl || c.imageUrlThumb || undefined,
            imageUrl: c.imageUrl || c.imageUrlThumb || undefined,
            type: "ONE_PIECE",
            owner: null,
          }));
        }
      }
    } catch (e) {
      console.warn("Renaiss list fallback in mint route:", e);
    }

    // Shuffle the candidate pool to ensure variety
    const shuffledRenaiss = [...renaissList].sort(() => Math.random() - 0.5);
    const shuffledFallback = [...FALLBACK_ONE_PIECE_CARDS].sort(() => Math.random() - 0.5);

    const preparedCards: Array<{
      id: string;
      name: string;
      grade: string;
      franchise: string;
      priceUsd: number;
      imageUrl: string;
      certNumber: string;
      tokenId: string;
      origin: "physical";
      acquiredAt: string;
      mintArgs: {
        uri: string;
        cvaAssetId: string;
        traceabilityHash: `0x${string}`;
      };
    }> = [];

    for (let i = 0; i < cardsEarnedCount; i++) {
      let selectedCard: {
        name: string;
        grade: string;
        franchise: string;
        priceUsd: number;
        imageUrl: string;
        certNumber: string;
        tokenId: string;
      } | null = null;

      // 1. Pick distinct card from RenaissOS live pool
      if (shuffledRenaiss.length > 0) {
        const pickedItem = shuffledRenaiss[i % shuffledRenaiss.length];
        const fmvNum = parseFloat(pickedItem.fmvPriceInUSD) || parseFloat(pickedItem.askPriceInUSDT) || 120;
        const cardImg = pickedItem.frontWithoutStandImageUrl || pickedItem.frontImageUrl || pickedItem.imageUrl || "";

        selectedCard = {
          name: pickedItem.name || `One Piece Collectible #${i + 1}`,
          grade: pickedItem.grade ? `${pickedItem.gradingCompany || "PSA"} ${pickedItem.grade}` : "PSA 10 Gem Mint",
          franchise: "ONE PIECE TCG",
          priceUsd: fmvNum,
          imageUrl: cardImg || `/api/img?url=${encodeURIComponent("https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119.png")}`,
          certNumber: (8800000 + i * 314159 + Math.floor(Math.random() * 89999)).toString(),
          tokenId: pickedItem.tokenId || `OP-RENAISS-${Date.now()}-${i}`,
        };
      }

      // 2. Secondary API fallback via APITCG with distinct keywords
      if (!selectedCard) {
        try {
          const randomKeyword = OP_KEYWORDS[i % OP_KEYWORDS.length];
          const opGame = APITCG_GAMES.find((g) => g.id === "one-piece") || APITCG_GAMES[0];
          const apiCards = await searchTcgCards(opGame, randomKeyword, 15);
          if (apiCards && apiCards.length > 0) {
            const pickedApi = apiCards[i % apiCards.length];
            selectedCard = {
              name: pickedApi.name,
              grade: "PSA 10 Gem Mint",
              franchise: "ONE PIECE TCG",
              priceUsd: Math.floor(80 + (i * 45) + Math.random() * 250),
              imageUrl: pickedApi.imageUrl.startsWith("http") ? `/api/img?url=${encodeURIComponent(pickedApi.imageUrl)}` : pickedApi.imageUrl,
              certNumber: (7700000 + i * 271828 + Math.floor(Math.random() * 89999)).toString(),
              tokenId: pickedApi.id,
            };
          }
        } catch {}
      }

      // 3. Fallback to distinct curated One Piece card catalog
      if (!selectedCard) {
        const fallbackCard = shuffledFallback[i % shuffledFallback.length];
        selectedCard = {
          ...fallbackCard,
          certNumber: (8849200 + i * 137 + Math.floor(Math.random() * 90)).toString(),
          tokenId: `${fallbackCard.tokenId}-${i}`,
        };
      }

      // Generate real on-chain mint parameters
      const cardId = `rwa_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
      const cvaAssetId = `cva_${selectedCard.tokenId}_${Date.now()}`;

      // Build a metadata URI string for the token
      const uri = `cleanverse://CVA-OPCARD/${cvaAssetId}/${encodeURIComponent(selectedCard.name)}/${encodeURIComponent(selectedCard.grade)}`;

      // Generate a real bytes32 traceability hash from card data
      const traceabilityHash = keccak256(
        toHex(`${cvaAssetId}:${selectedCard.name}:${selectedCard.certNumber}:${walletAddress}:${Date.now()}`)
      );

      preparedCards.push({
        id: cardId,
        name: selectedCard.name,
        grade: selectedCard.grade,
        franchise: selectedCard.franchise,
        priceUsd: selectedCard.priceUsd,
        imageUrl: selectedCard.imageUrl,
        certNumber: selectedCard.certNumber,
        tokenId: selectedCard.tokenId,
        origin: "physical" as const,
        acquiredAt: new Date().toISOString().slice(0, 10).replaceAll("-", "."),
        mintArgs: {
          uri,
          cvaAssetId,
          traceabilityHash,
        },
      });
    }

    const contractAddress =
      process.env.NEXT_PUBLIC_RWA_CARD_CONTRACT_ADDRESS || "0x364b4ae518dabd70099ddbc4069ca5510c5fea24";

    let lastTxHash = "0x";
    const privateKey = process.env.MONAD_PRIVATE_KEY;
    
    if (privateKey) {
      try {
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        const publicClient = createPublicClient({
          chain: monadTestnet,
          transport: http(),
        });
        const walletClient = createWalletClient({
          account,
          chain: monadTestnet,
          transport: http(),
        });

        // Batch mint all cards in a single transaction to prevent nonce collisions and save gas
        const uris = preparedCards.map((c) => c.mintArgs.uri);
        const cvaAssetIds = preparedCards.map((c) => c.mintArgs.cvaAssetId);
        const traceabilityHashes = preparedCards.map((c) => c.mintArgs.traceabilityHash);

        const txHash = await walletClient.writeContract({
          address: contractAddress as `0x${string}`,
          abi: CLEANVERSE_RWA_CARD_ABI,
          functionName: "batchMintRWACards",
          args: [
            walletAddress as `0x${string}`,
            uris,
            cvaAssetIds,
            traceabilityHashes,
          ] as const,
        });
        lastTxHash = txHash;

        if (lastTxHash !== "0x") {
          await publicClient.waitForTransactionReceipt({ hash: lastTxHash as `0x${string}` });
        }
      } catch (err) {
        console.error("Backend minting execution failed:", err);
        return NextResponse.json({ error: "Backend minting execution failed" }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      cards: preparedCards,
      count: preparedCards.length,
      contractAddress,
      txHash: lastTxHash !== "0x" ? lastTxHash : undefined,
    });
  } catch (err) {
    console.error("Mint preparation failed:", err);
    return NextResponse.json({ error: "Mint preparation failed" }, { status: 500 });
  }
}
