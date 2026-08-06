/**
* BSC    (read-only,  )
* -   SBT    → tokenURI → ()
* - Etherscan V2(, chainid=56) ,  BscScan V1.
*   : env ETHERSCAN_API_KEY ()  BSCSCAN_API_KEY.
* -  / .  API  →   .
 */

export interface OnchainSbt {
  tokenId: string;
  title?: string;
  description?: string;
  imageUrl?: string;
}

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

/** Etherscan V2 / BscScan V1      URL  */
function scanUrl(params: Record<string, string>): string {
  const ethKey = process.env.ETHERSCAN_API_KEY;
  const bscKey = process.env.BSCSCAN_API_KEY;
  if (ethKey) {
    const q = new URLSearchParams({ chainid: "56", apikey: ethKey, ...params });
    return `https://api.etherscan.io/v2/api?${q}`;
  }
  if (bscKey) {
    const q = new URLSearchParams({ apikey: bscKey, ...params });
    return `https://api.bscscan.com/api?${q}`;
  }
  throw new Error("Missing ETHERSCAN_API_KEY / BSCSCAN_API_KEY");
}

function resolveIpfs(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("ipfs://ipfs/")) return IPFS_GATEWAY + url.slice("ipfs://ipfs/".length);
  if (url.startsWith("ipfs://")) return IPFS_GATEWAY + url.slice("ipfs://".length);
  return url;
}

/** eth_call  hex  ABI string   ([offset][length][utf8 bytes]) */
function decodeAbiString(hex?: string): string {
  if (!hex || hex === "0x") return "";
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  try {
    const len = parseInt(h.slice(64, 128), 16); // =
    if (!Number.isFinite(len) || len <= 0) return "";
    const bytesHex = h.slice(128, 128 + len * 2);
    let s = "";
    for (let i = 0; i < bytesHex.length; i += 2) s += String.fromCharCode(parseInt(bytesHex.substr(i, 2), 16));
    try {
      return decodeURIComponent(escape(s)); // latin1 → utf-8
    } catch {
      return s;
    }
  } catch {
    return "";
  }
}

/** tokenURI(uint256)  eth_call   */
async function readTokenUri(contract: string, tokenId: string): Promise<string> {
  const selector = "c87b56dd"; // keccak("tokenURI(uint256)")[:4]
  const arg = BigInt(tokenId).toString(16).padStart(64, "0");
  const url = scanUrl({ module: "proxy", action: "eth_call", to: contract, data: "0x" + selector + arg, tag: "latest" });
  const res = await fetch(url, { next: { revalidate: 300 } });
  const j = (await res.json()) as { result?: string };
  return resolveIpfs(decodeAbiString(j.result)) ?? "";
}

/** (JSON)  — data:URI  http(s)/ipfs */
async function fetchMetadata(
  uri: string
): Promise<{ name?: string; description?: string; image?: string } | null> {
  if (!uri) return null;
  if (uri.startsWith("data:application/json")) {
    const payload = uri.slice(uri.indexOf(",") + 1);
    try {
      const json = uri.includes(";base64")
        ? Buffer.from(payload, "base64").toString("utf8")
        : decodeURIComponent(payload);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
  const res = await fetch(uri, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  return (await res.json()) as { name?: string; description?: string; image?: string };
}

/**
*  SBT     ( ) .
*     ( out ).     .
 */
export async function getSbtsFromContract(contract: string, wallet: string): Promise<OnchainSbt[]> {
  const url = scanUrl({
    module: "account",
    action: "tokennfttx",
    contractaddress: contract,
    address: wallet,
    page: "1",
    offset: "200",
    sort: "asc",
  });
  const res = await fetch(url, { next: { revalidate: 300 } });
  const data = (await res.json()) as {
    status: string;
    result: Array<{ tokenID?: string; to?: string; from?: string }>;
  };
  if (data.status !== "1" || !Array.isArray(data.result)) return [];

  const w = wallet.toLowerCase();
  const owned = new Set<string>();
  for (const tx of data.result) {
    const id = String(tx.tokenID ?? "");
    if (!id) continue;
    if ((tx.to ?? "").toLowerCase() === w) owned.add(id);
    if ((tx.from ?? "").toLowerCase() === w) owned.delete(id);
  }

  // Set ([...owned]) tsconfig target(es5)   — Array.from
  const ids = Array.from(owned).slice(0, 12);
  return Promise.all(
    ids.map(async (tokenId): Promise<OnchainSbt> => {
      try {
        const uri = await readTokenUri(contract, tokenId);
        const meta = await fetchMetadata(uri);
        return {
          tokenId,
          title: meta?.name,
          description: meta?.description,
          imageUrl: resolveIpfs(meta?.image),
        };
      } catch {
        return { tokenId };
      }
    })
  );
}
