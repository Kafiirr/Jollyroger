import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";

const creditcoinTestnet = defineChain({
  id: 102031,
  name: "Creditcoin CC3 Testnet",
  nativeCurrency: { name: "Creditcoin", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] },
  },
});

import path from "path";

const envPath = path.resolve(".env.local");
if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}
const env = fs.readFileSync(envPath, "utf8");
const pk = env.match(/PRIVATE_KEY=([^\r\n]+)/)[1].trim();
const account = privateKeyToAccount(pk);
console.log("Wallet address for PRIVATE_KEY:", account.address);

const publicClient = createPublicClient({
  chain: creditcoinTestnet,
  transport: http(),
});

async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance:", Number(balance) / 1e18, "tCTC");

  const contractAddress = "0x1a8757a621b0ac08aa91312e282307fb2e21b87f";
  const code = await publicClient.getBytecode({ address: contractAddress });
  console.log("Contract bytecode length at", contractAddress, ":", code ? code.length : 0);

  // Check if contract has code
  if (!code || code === "0x") {
    console.log("❌ WARNING: No contract bytecode found at", contractAddress);
  } else {
    console.log("✅ Contract bytecode exists!");
  }
}

main().catch(console.error);
