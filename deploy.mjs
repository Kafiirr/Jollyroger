import fs from "fs";
import path from "path";
import solc from "solc";
import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz/"] },
  },
});

async function main() {
  const privateKey = process.env.MONAD_PRIVATE_KEY;
  if (!privateKey) throw new Error("Missing MONAD_PRIVATE_KEY in .env.local");

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
  const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http() });

  console.log("Compiling CleanverseRWACard.sol...");
  const source = fs.readFileSync(path.join(process.cwd(), "contracts", "CleanverseRWACard.sol"), "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "CleanverseRWACard.sol": {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    let hasError = false;
    for (const error of output.errors) {
      if (error.severity === "error") {
        console.error("Compilation error:", error.formattedMessage);
        hasError = true;
      } else {
        console.warn("Compilation warning:", error.formattedMessage);
      }
    }
    if (hasError) process.exit(1);
  }

  const contract = output.contracts["CleanverseRWACard.sol"]["CleanverseRWACard"];
  const abi = contract.abi;
  const bytecode = "0x" + contract.evm.bytecode.object;

  console.log("Deploying contract from address:", account.address);
  
  try {
    const hash = await walletClient.deployContract({
      abi,
      bytecode,
    });
    console.log("Deployment transaction sent:", hash);
    
    console.log("Waiting for confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    console.log("Contract successfully deployed!");
    console.log("Contract Address:", receipt.contractAddress);
  } catch (err) {
    console.error("Deployment failed:", err);
  }
}

main().catch(console.error);
