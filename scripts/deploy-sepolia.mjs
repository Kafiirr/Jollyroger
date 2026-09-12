import fs from "fs";
import path from "path";
import solc from "solc";
import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Load .env.local
const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...vals] = trimmed.split("=");
      process.env[key.trim()] = vals.join("=").trim();
    }
  }
}

const sepolia = defineChain({
  id: 11155111,
  name: "Ethereum Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"] },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
  },
  testnet: true,
});

async function deploySepolia() {
  console.log("🚀 Compiling PhysicalVaultEscrow.sol for Ethereum Sepolia...");
  const contractPath = path.resolve("contracts/PhysicalVaultEscrow.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "PhysicalVaultEscrow.sol": { content: source },
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

  const contract = output.contracts["PhysicalVaultEscrow.sol"]["PhysicalVaultEscrow"];
  const abi = contract.abi;
  const bytecode = `0x${contract.evm.bytecode.object}`;
  console.log("✅ PhysicalVaultEscrow compiled successfully!");

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY in .env.local");
  }

  const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
  console.log(`Deployer Account: ${account.address}`);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Sepolia Balance: ${Number(balance) / 1e18} ETH`);

  console.log("Broadcasting deployment transaction to Ethereum Sepolia...");
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [],
  });

  console.log(`Tx broadcasted! Hash: ${hash}`);
  console.log(`Explorer Link: https://sepolia.etherscan.io/tx/${hash}`);

  console.log("Waiting for block confirmation on Sepolia...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const deployedAddress = receipt.contractAddress;

  console.log(`\n🎉 PhysicalVaultEscrow Deployed at: ${deployedAddress}`);
  console.log(`Etherscan: https://sepolia.etherscan.io/address/${deployedAddress}\n`);

  // Write to a deployment record file for other scripts to read
  fs.writeFileSync(
    path.resolve("scripts/deployed-sepolia.json"),
    JSON.stringify({ address: deployedAddress, txHash: hash, deployedAt: new Date().toISOString() }, null, 2)
  );

  return deployedAddress;
}

deploySepolia().catch((err) => {
  console.error("Sepolia deployment failed:", err);
  process.exit(1);
});
