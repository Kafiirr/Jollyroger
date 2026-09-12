import https from "node:https";
import { createPublicClient, custom, http, defineChain } from "viem";

const creditcoinTestnet = defineChain({
  id: 102031,
  name: "Creditcoin CC3 Testnet",
  nativeCurrency: { name: "Creditcoin", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] },
  },
});

// Custom fetch that forces IPv4
const ipv4Fetch = (input, init) => {
  return new Promise((resolve, reject) => {
    const url = typeof input === "string" ? new URL(input) : input;
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: init?.method || "POST",
        family: 4, // strictly IPv4
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

async function testViem() {
  const publicClient = createPublicClient({
    chain: creditcoinTestnet,
    transport: http("https://rpc.cc3-testnet.creditcoin.network", {
      fetchOptions: {},
      // viem supports custom fetch via transport option `fetch`!
      fetchFn: ipv4Fetch,
    }),
  });

  console.log("Testing viem with ipv4Fetch...");
  const blockNumber = await publicClient.getBlockNumber();
  console.log("Block number from Viem:", blockNumber);

  const balance = await publicClient.getBalance({
    address: "0xf23480B0AFa902bb7646de92b2B538a6A769FdDA",
  });
  console.log("Deployer balance:", Number(balance) / 1e18, "tCTC");

  // Check code at deployed contract
  const code = await publicClient.getCode({
    address: "0x1a8757a621b0ac08aa91312e282307fb2e21b87f",
  });
  console.log("Contract bytecode length:", code?.length);
}

testViem().catch(console.error);
