import fs from "fs";
import path from "path";
import solc from "solc";
import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadExplorer", url: "https://testnet.monadscan.com" },
  },
  testnet: true,
});

async function deploy() {
  console.log("Compiling CleanverseRWACard.sol...");
  const contractPath = path.resolve("contracts/CleanverseRWACard.sol");
  const source = fs.readFileSync(contractPath, "utf8");

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
    const fatal = output.errors.filter((e) => e.severity === "error");
    if (fatal.length > 0) {
      console.error("Compilation errors:", fatal);
      process.exit(1);
    }
  }

  const contract = output.contracts["CleanverseRWACard.sol"]["CleanverseRWACard"];
  const abi = contract.abi;
  const bytecode = `0x${contract.evm.bytecode.object}`;

  console.log("✅ CleanverseRWACard.sol compiled successfully!");

  const privateKey = process.env.MONAD_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Missing MONAD_PRIVATE_KEY or PRIVATE_KEY in environment variables / .env.local");
  }

  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  console.log(`Deploying from account: ${account.address} on Monad Testnet...`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Account Balance: ${(Number(balance) / 1e18).toFixed(4)} MON`);

  const hash = await walletClient.deployContract({
    abi,
    bytecode,
  });

  console.log(`\n🚀 Deployment transaction broadcasted to Monad Testnet!`);
  console.log(`Transaction Hash: ${hash}`);
  console.log(`Explorer Link: https://testnet.monadscan.com/tx/${hash}`);

  console.log("Waiting for block confirmation on Monad Testnet...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const deployedAddress = receipt.contractAddress;

  console.log(`\n🎉 CleanverseRWACard Contract Deployed On-Chain!`);
  console.log(`Contract Address: ${deployedAddress}`);
  console.log(`Contract Explorer: https://testnet.monadscan.com/address/${deployedAddress}`);

  return { deployedAddress, abi };
}

deploy().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
