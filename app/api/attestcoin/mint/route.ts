import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CREDITCOIN_RWA_VAULT_ABI, CREDITCOIN_RWA_VAULT_ADDRESS } from "@/lib/contracts/CreditcoinRWAVaultABI";
import { getDynamicRenaissCards } from "@/lib/api/renaiss";
import { supabase } from "@/lib/supabase";

const creditcoinTestnet = defineChain({
  id: 102031,
  name: "Creditcoin CC3 Testnet",
  nativeCurrency: { name: "Creditcoin", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] },
  },
  blockExplorers: {
    default: { name: "CreditcoinExplorer", url: "https://creditcoin-testnet.blockscout.com" },
  },
});

/**
 * Custom fetch using node:https with family: 4 to force IPv4
 * Prevents Node.js undici dual-stack IPv6 resolution hanging/timing out on WSL
 */
const ipv4Fetch = (input: any, init?: any): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const url = typeof input === "string" ? new URL(input) : input;
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: init?.method || "POST",
        family: 4,
        headers: init?.headers,
      },
      (res) => {
        const chunks: any[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString();
          resolve(
            new Response(body, {
              status: res.statusCode,
              headers: res.headers as any,
            })
          );
        });
      }
    );
    req.on("error", reject);
    if (init?.body) {
      req.write(init.body);
    }
    req.end();
  });
};

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, score = 0, count = 1 } = await req.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    // Allow minting whatever number of cards the user earned (up to 50)
    const mintCount = Math.min(Math.max(1, count), 50);
    const dynamicCards = await getDynamicRenaissCards({ category: "ONE_PIECE", limit: 50 });
    
    // Shuffle the card pool to provide high variety
    const pool = [...dynamicCards];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const selectedCards = [];

    for (let i = 0; i < mintCount; i++) {
      const template =
        pool.length > 0
          ? pool[i % pool.length]
          : {
              tokenId: String(Date.now() + i),
              name: "PSA 10 Gem Mint Monkey D. Luffy",
              grade: "PSA 10 Gem Mint",
              franchise: "One Piece TCG",
              priceUsd: 653,
              imageUrl: "/cards/luffy-gear5-manga.png",
              certNumber: 92799146,
              rawCert: "PSA92799146",
              origin: "physical" as const,
            };

      const certNum = template.certNumber || Math.floor(10000000 + Math.random() * 90000000);
      selectedCards.push({
        id: `ctc_card_${Date.now()}_${i}`,
        name: template.name,
        grade: template.grade,
        franchise: template.franchise,
        priceUsd: template.priceUsd,
        imageUrl: template.imageUrl,
        certNumber: String(certNum),
        tokenId: String(template.tokenId || (Date.now() % 100000 + i)),
        origin: "physical" as const,
        acquiredAt: new Date().toISOString().slice(0, 10),
      });
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.error("Missing PRIVATE_KEY environment variable");
      return NextResponse.json({ error: "Server missing deployer private key" }, { status: 500 });
    }

    const formattedKey = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
    const account = privateKeyToAccount(formattedKey);

    const walletClient = createWalletClient({
      account,
      chain: creditcoinTestnet,
      transport: http("https://rpc.cc3-testnet.creditcoin.network", { fetchFn: ipv4Fetch }),
    });

    const publicClient = createPublicClient({
      chain: creditcoinTestnet,
      transport: http("https://rpc.cc3-testnet.creditcoin.network", { fetchFn: ipv4Fetch }),
    });

    console.log(
      `[Creditcoin CC3] Initiating atomic batch mint for ${selectedCards.length} card(s) to ${walletAddress}...`
    );

    const cardInputs = selectedCards.map((card) => ({
      certNumber: BigInt(card.certNumber),
      cardName: card.name,
      grade: card.grade,
      appraisalUsd: BigInt(card.priceUsd * 100),
      uri: card.imageUrl,
    }));

    const txHash = await walletClient.writeContract({
      address: CREDITCOIN_RWA_VAULT_ADDRESS,
      abi: CREDITCOIN_RWA_VAULT_ABI,
      functionName: "batchMintCards",
      args: [walletAddress as `0x${string}`, cardInputs],
    });

    console.log(`[Creditcoin CC3] Batch mint broadcasted: ${txHash}. Waiting for block confirmation...`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(
      `[Creditcoin CC3] All ${selectedCards.length} cards successfully batch minted in Block ${receipt.blockNumber}, status: ${receipt.status}!`
    );

    // Persist all minted cards to Supabase database
    try {
      const userRoomId = walletAddress.toLowerCase();
      for (const card of selectedCards) {
        await supabase.from("showcase_cards").insert({
          name: card.name,
          grade: card.grade,
          franchise: card.franchise,
          image_url: card.imageUrl,
          acquired_at: card.acquiredAt || new Date().toISOString().slice(0, 10),
          origin: "onchain",
          token_id: card.tokenId,
          room_id: userRoomId,
          wallet_address: walletAddress.toLowerCase(),
        });
      }
    } catch (dbErr) {
      console.warn("Backend Supabase insert notice:", dbErr);
    }

    return NextResponse.json({
      success: true,
      txHash,
      cards: selectedCards,
      creditcoinExplorerUrl: `https://creditcoin-testnet.blockscout.com/tx/${txHash}`,
    });
  } catch (err: any) {
    console.error("Mint API error:", err);
    return NextResponse.json({ error: err.message || "Mint error" }, { status: 500 });
  }
}
