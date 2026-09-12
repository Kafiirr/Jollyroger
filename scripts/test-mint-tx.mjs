import https from "node:https";
import fs from "fs";
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const env = fs.readFileSync("/home/kafir/renaiss/.env.local", "utf8");
const pkey = env.match(/PRIVATE_KEY=([^\r\n]+)/)[1].trim();

const CREDITCOIN_RWA_VAULT_ADDRESS = "0x1a8757a621b0ac08aa91312e282307fb2e21b87f";
const CREDITCOIN_RWA_VAULT_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "string", name: "cardName", type: "string" },
      { internalType: "string", name: "grade", type: "string" },
      { internalType: "uint256", name: "certNumber", type: "uint256" },
      { internalType: "uint256", name: "appraisalUsd", type: "uint256" },
      { internalType: "string", name: "uri", type: "string" },
    ],
    name: "mintDirectCard",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const creditcoinTestnet = defineChain({
  id: 102031,
  name: "Creditcoin CC3 Testnet",
  nativeCurrency: { name: "Creditcoin", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] },
  },
  blockExplorers: {
    default: { name: "CreditcoinExplorer", url: "https://dashboard.cc3-testnet.creditcoin.network" },
  },
});

const ipv4Fetch = (input, init) => {
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
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString();
          resolve(
            new Response(body, {
              status: res.statusCode,
              headers: res.headers,
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

async function main() {
  const account = privateKeyToAccount(pkey.startsWith("0x") ? pkey : `0x${pkey}`);
  console.log("Account:", account.address);

  const walletClient = createWalletClient({
    account,
    chain: creditcoinTestnet,
    transport: http("https://rpc.cc3-testnet.creditcoin.network", { fetchFn: ipv4Fetch }),
  });

  const publicClient = createPublicClient({
    chain: creditcoinTestnet,
    transport: http("https://rpc.cc3-testnet.creditcoin.network", { fetchFn: ipv4Fetch }),
  });

  const userRecipient = "0x710e86fa6D521934864A10C2b1f5a03c3221Ac02";
  console.log("Minting on-chain card to recipient:", userRecipient);

  const txHash = await walletClient.writeContract({
    address: CREDITCOIN_RWA_VAULT_ADDRESS,
    abi: CREDITCOIN_RWA_VAULT_ABI,
    functionName: "mintDirectCard",
    args: [
      userRecipient,
      "PSA 10 Gem Mint Monkey D. Luffy OP05-119",
      "PSA 10 Gem Mint",
      92799146n,
      65300n,
      "/cards/luffy-gear5-manga.png",
    ],
  });

  console.log("\n🚀 Real Transaction Hash on Creditcoin CC3:", txHash);
  console.log(`Explorer Link: https://dashboard.cc3-testnet.creditcoin.network/tx/${txHash}`);

  console.log("Waiting for confirmation receipt...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("Confirmed in Block:", receipt.blockNumber);
  console.log("Status:", receipt.status);
}

main().catch(console.error);
