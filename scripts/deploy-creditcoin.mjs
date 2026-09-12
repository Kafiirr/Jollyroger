import fs from "fs";
import path from "path";
import solc from "solc";
import https from "node:https";
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
          resolve(
            new Response(Buffer.concat(chunks).toString(), {
              status: res.statusCode,
              headers: res.headers,
            })
          );
        });
      }
    );
    req.on("error", reject);
    if (init?.body) req.write(init.body);
    req.end();
  });
};

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
  testnet: true,
});

async function deployCreditcoin() {
  console.log("🚀 Compiling CreditcoinRWAVaultASC.sol for Creditcoin CC3 Testnet...");
  const contractPath = path.resolve("contracts/CreditcoinRWAVaultASC.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "CreditcoinRWAVaultASC.sol": { content: source },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
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

  const contract = output.contracts["CreditcoinRWAVaultASC.sol"]["CreditcoinRWAVaultASC"];
  const abi = contract.abi;
  const bytecode = `0x${contract.evm.bytecode.object}`;
  console.log("✅ CreditcoinRWAVaultASC compiled successfully with batchMintCards support!");

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY in .env.local");
  }

  const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
  console.log(`Deployer Account: ${account.address}`);

  const publicClient = createPublicClient({
    chain: creditcoinTestnet,
    transport: http("https://rpc.cc3-testnet.creditcoin.network", { fetchFn: ipv4Fetch }),
  });

  const walletClient = createWalletClient({
    account,
    chain: creditcoinTestnet,
    transport: http("https://rpc.cc3-testnet.creditcoin.network", { fetchFn: ipv4Fetch }),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Creditcoin CC3 Balance: ${Number(balance) / 1e18} tCTC`);

  // Official CC3 Testnet Decoder contract address
  const DECODER_ADDRESS = "0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f";

  // Check if Sepolia vault was deployed
  let sepoliaVaultAddress = "0x0000000000000000000000000000000000000000";
  const sepoliaDeployRecord = path.resolve("scripts/deployed-sepolia.json");
  if (fs.existsSync(sepoliaDeployRecord)) {
    const rec = JSON.parse(fs.readFileSync(sepoliaDeployRecord, "utf8"));
    sepoliaVaultAddress = rec.address || sepoliaVaultAddress;
  }

  console.log(`Using CC3 Decoder: ${DECODER_ADDRESS}`);
  console.log(`Configured Sepolia Vault Address: ${sepoliaVaultAddress}`);

  console.log("Broadcasting deployment transaction to Creditcoin CC3 Testnet...");
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [DECODER_ADDRESS, sepoliaVaultAddress],
  });

  console.log(`Tx broadcasted! Hash: ${hash}`);
  console.log(`Explorer Link: https://creditcoin-testnet.blockscout.com/tx/${hash}`);

  console.log("Waiting for block confirmation on Creditcoin CC3 Testnet...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const deployedAddress = receipt.contractAddress;

  console.log(`\n🎉 CreditcoinRWAVaultASC Deployed at: ${deployedAddress}`);
  console.log(`Creditcoin Explorer: https://creditcoin-testnet.blockscout.com/address/${deployedAddress}\n`);

  // Save to deployed-creditcoin.json
  fs.writeFileSync(
    path.resolve("scripts/deployed-creditcoin.json"),
    JSON.stringify({ address: deployedAddress, txHash: hash, deployedAt: new Date().toISOString() }, null, 2)
  );

  // Write updated ABI to lib/contracts/CreditcoinRWAVaultABI.ts
  const abiTsPath = path.resolve("lib/contracts/CreditcoinRWAVaultABI.ts");
  const abiContent = `export const CREDITCOIN_RWA_VAULT_ADDRESS =
  (process.env.NEXT_PUBLIC_CREDITCOIN_VAULT_ADDRESS as \`0x\${string}\`) ||
  "${deployedAddress}";

export const SEPOLIA_ESCROW_ADDRESS =
  (process.env.NEXT_PUBLIC_SEPOLIA_ESCROW_ADDRESS as \`0x\${string}\`) ||
  "${sepoliaVaultAddress}";

export const CREDITCOIN_RWA_VAULT_ABI = ${JSON.stringify(abi, null, 2)} as const;

export const SEPOLIA_ESCROW_ABI = [
  {
    inputs: [
      { internalType: "string", name: "cardName", type: "string" },
      { internalType: "uint256", name: "certNumber", type: "uint256" },
      { internalType: "string", name: "grade", type: "string" },
      { internalType: "uint256", name: "appraisalUsd", type: "uint256" },
    ],
    name: "depositPhysicalCard",
    outputs: [{ internalType: "uint256", name: "vaultId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
`;
  fs.writeFileSync(abiTsPath, abiContent);
  console.log("✅ Updated lib/contracts/CreditcoinRWAVaultABI.ts with new contract address & ABI!");

  return deployedAddress;
}

deployCreditcoin().catch((err) => {
  console.error("Creditcoin deployment failed:", err);
  process.exit(1);
});
