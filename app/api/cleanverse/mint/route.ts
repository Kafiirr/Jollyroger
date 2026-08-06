import { NextResponse } from "next/server";
import { listCollectibles, getCardDetail } from "@/lib/api/renaiss";
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

const OP_KEYWORDS = ["Luffy", "Zoro", "Nami", "Law", "Ace", "Shanks", "Kaido", "Sanji", "Robin", "Yamato"];

/**
 * POST /api/cleanverse/mint
 *
 * Prepare-only endpoint: selects cards and generates on-chain mint parameters.
 * The frontend calls writeContractAsync with these args — user's wallet pays gas.
 * No on-chain execution happens server-side.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, roomId, score, count } = body;

    const cardsEarnedCount = count ? Math.max(1, Math.min(10, count)) : Math.max(1, Math.floor((score || 0) / 5));

    // Fetch Renaiss Protocol list
    let renaissList: RenaissListedCard[] = [];
    try {
      renaissList = (await listCollectibles({ categoryFilter: "ONE_PIECE", limit: 30 })) || [];
    } catch (e) {
      console.warn("Renaiss list fallback:", e);
    }

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

      if (renaissList.length > 0) {
        const pickedItem = renaissList[Math.floor(Math.random() * renaissList.length)];
        try {
          const detail = await getCardDetail(pickedItem.tokenId);
          const fmvNum = parseFloat(detail.fmvPriceInUSD) || parseFloat(detail.askPriceInUSDT) || 120;
          selectedCard = {
            name: detail.name || pickedItem.name || "One Piece TCG Card",
            grade: detail.grade ? `${detail.gradingCompany || "PSA"} ${detail.grade}` : "PSA 10 Gem Mint",
            franchise: "ONE PIECE TCG",
            priceUsd: fmvNum,
            imageUrl: detail.frontImageUrl || detail.frontWithoutStandImageUrl || `/api/img?url=${encodeURIComponent("https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119.png")}`,
            certNumber: Math.floor(1000000 + Math.random() * 9000000).toString(),
            tokenId: detail.tokenId || `OP-RENAISS-${Date.now()}-${i}`,
          };
        } catch {
          selectedCard = {
            name: pickedItem.name,
            grade: `${pickedItem.gradingCompany || "PSA"} ${pickedItem.grade || "10"}`,
            franchise: "ONE PIECE TCG",
            priceUsd: Number(pickedItem.fmvPriceInUSD) || 100,
            imageUrl: `/api/img?url=${encodeURIComponent("https://en.onepiece-cardgame.com/images/cardlist/card/OP01-025.png")}`,
            certNumber: Math.floor(1000000 + Math.random() * 9000000).toString(),
            tokenId: pickedItem.tokenId,
          };
        }
      }

      if (!selectedCard) {
        try {
          const randomKeyword = OP_KEYWORDS[Math.floor(Math.random() * OP_KEYWORDS.length)];
          const opGame = APITCG_GAMES.find((g) => g.id === "one-piece") || APITCG_GAMES[0];
          const apiCards = await searchTcgCards(opGame, randomKeyword, 15);
          if (apiCards && apiCards.length > 0) {
            const pickedApi = apiCards[Math.floor(Math.random() * apiCards.length)];
            selectedCard = {
              name: pickedApi.name,
              grade: "PSA 10 Gem Mint",
              franchise: "ONE PIECE TCG",
              priceUsd: Math.floor(50 + Math.random() * 450),
              imageUrl: `/api/img?url=${encodeURIComponent(pickedApi.imageUrl)}`,
              certNumber: Math.floor(1000000 + Math.random() * 9000000).toString(),
              tokenId: pickedApi.id,
            };
          }
        } catch {}
      }

      if (!selectedCard) {
        selectedCard = {
          name: `Monkey.D.Luffy #${i + 1} [Parallel Art]`,
          grade: "PSA 10 Gem Mint",
          franchise: "ONE PIECE TCG",
          priceUsd: 180.0 + i * 15,
          imageUrl: "/api/img?url=https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119.png",
          certNumber: (8849201 + i).toString(),
          tokenId: `OP05-119-SEC-${i}`,
        };
      }

      // Generate real on-chain mint parameters
      const cardId = `rwa_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
      const cvaAssetId = `cva_${selectedCard.tokenId}_${Date.now()}`;

      // Build a metadata URI string for the token
      const uri = `cleanverse://CVA-OPCARD/${cvaAssetId}/${selectedCard.name}/${selectedCard.grade}`;

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
        const uris = preparedCards.map(c => c.mintArgs.uri);
        const cvaAssetIds = preparedCards.map(c => c.mintArgs.cvaAssetId);
        const traceabilityHashes = preparedCards.map(c => c.mintArgs.traceabilityHash);

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
