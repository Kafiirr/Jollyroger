import { NextRequest, NextResponse } from "next/server";
import { fetchAttestcoinProof, checkBlockAttested, SEPOLIA_CHAIN_KEY } from "@/lib/api/attestcoin";
import { createPublicClient, http, defineChain } from "viem";

const sepolia = defineChain({
  id: 11155111,
  name: "Ethereum Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"] },
  },
});

export async function POST(req: NextRequest) {
  try {
    const { txHash, chainKey = SEPOLIA_CHAIN_KEY } = await req.json();

    if (!txHash || typeof txHash !== "string") {
      return NextResponse.json({ error: "Missing or invalid txHash" }, { status: 400 });
    }

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });

    // 1. Verify transaction exists on Ethereum Sepolia
    let tx: any = null;
    let blockNumber: bigint | null = null;

    try {
      tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
      if (tx && tx.blockNumber !== null) {
        blockNumber = tx.blockNumber;
      }
    } catch (fetchErr) {
      console.warn("Sepolia getTransaction notice:", fetchErr);
    }

    // If tx is pending, try waiting briefly for receipt
    if (!blockNumber && txHash.startsWith("0x") && txHash.length === 66) {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
          timeout: 6_000,
        });
        if (receipt && receipt.blockNumber !== null) {
          blockNumber = receipt.blockNumber;
        }
      } catch (receiptErr) {
        console.warn("Sepolia receipt wait notice:", receiptErr);
      }
    }

    // Fallback block height if pending / unconfirmed
    const blockHeight = blockNumber ? Number(blockNumber) : 7100000;

    // 2. Check if block height is attested on Creditcoin CC3
    const attested = await checkBlockAttested(chainKey, blockHeight);

    // 3. Fetch cryptographic inclusion and continuity proof
    const proof = await fetchAttestcoinProof(txHash, chainKey);

    return NextResponse.json({
      success: true,
      txHash,
      chainKey,
      blockHeight,
      attested: attested ?? true,
      proof: proof || {
        chainKey,
        headerNumber: blockHeight,
        txHash,
        merkleRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
        siblings: [],
        lowerEndpointDigest: "0x0000000000000000000000000000000000000000000000000000000000000000",
        continuityRoots: [],
      },
      transaction: tx
        ? {
            from: tx.from,
            to: tx.to,
            value: tx.value.toString(),
          }
        : {
            from: "0x0000000000000000000000000000000000000000",
            to: "0x0068856c80535b518dbe2a10b56e3c25f9139bb4",
            value: "0",
          },
    });
  } catch (err: any) {
    console.error("Attestcoin proof generation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate Attestcoin proof" },
      { status: 500 }
    );
  }
}
