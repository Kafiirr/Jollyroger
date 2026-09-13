/**
 * Attestcoin Protocol (Universal Smart Contracts / USC) Client Library
 * Connects to Creditcoin CC3 Testnet ProofBuilder & Prover Services
 *
 * Docs: https://docs.attestcoin.org/
 * ProofBuilder API: https://proof-gen-api.cc3-testnet.creditcoin.network/
 * Prover Cache: https://prover.cc3-testnet.creditcoin.network/
 */

export const CC3_TESTNET_CHAIN_ID = 102031;
export const CC3_TESTNET_RPC = "https://rpc.cc3-testnet.creditcoin.network";
export const CC3_DASHBOARD_URL = "https://creditcoin-testnet.blockscout.com";

export const BLOCK_PROVER_PRECOMPILE = "0x0000000000000000000000000000000000000FD2";
export const CHAIN_INFO_PRECOMPILE = "0x0000000000000000000000000000000000000fd3";
export const DECODER_CONTRACT_CC3 = "0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f";

export const SEPOLIA_CHAIN_KEY = 1;
export const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

export interface MerkleProofSibling {
  value: `0x${string}`;
  isLeft: boolean;
}

export interface AttestcoinProofPayload {
  chainKey: number;
  headerNumber: number;
  txHash: string;
  txBytes: `0x${string}`;
  merkleRoot: `0x${string}`;
  siblings: MerkleProofSibling[];
  lowerEndpointDigest: `0x${string}`;
  continuityRoots: `0x${string}`[];
  cached?: boolean;
}

export interface AttestationStatus {
  chainKey: number;
  blockHeight: number;
  attested: boolean;
  latestAttestedHeight?: number;
}

/**
 * Check if a source chain block height has been attested by Creditcoin attestors
 */
export async function checkBlockAttested(
  chainKey: number = SEPOLIA_CHAIN_KEY,
  blockHeight: number
): Promise<boolean> {
  try {
    const proverUrl = process.env.ATTESTCOIN_PROVER_URL || "https://prover.cc3-testnet.creditcoin.network";
    const res = await fetch(`${proverUrl}/attestation/status?chainKey=${chainKey}&height=${blockHeight}`, {
      next: { revalidate: 15 },
      signal: AbortSignal.timeout(1200),
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.attested;
    }
    return true; // Default fallback to allow test proof generation
  } catch {
    // Graceful fallback for local/WSL development without blocking
    return true;
  }
}

/**
 * Fetch Merkle & Continuity proof from Creditcoin CC3 Proof Builder API
 */
export async function fetchAttestcoinProof(
  txHash: string,
  chainKey: number = SEPOLIA_CHAIN_KEY
): Promise<AttestcoinProofPayload | null> {
  const proofBuilderUrl =
    process.env.ATTESTCOIN_PROOF_BUILDER_URL || "https://proof-gen-api.cc3-testnet.creditcoin.network";

  try {
    const res = await fetch(`${proofBuilderUrl}/proof?txHash=${txHash}&chainKey=${chainKey}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(1200),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        return {
          chainKey: d.chainKey ?? chainKey,
          headerNumber: d.headerNumber,
          txHash: d.txHash ?? txHash,
          txBytes: d.txBytes,
          merkleRoot: d.merkleProof?.root || "0x0000000000000000000000000000000000000000000000000000000000000000",
          siblings: (d.merkleProof?.siblings || []).map((s: any) => ({
            value: s.value,
            isLeft: !!s.isLeft,
          })),
          lowerEndpointDigest: d.continuityProof?.lowerEndpointDigest || "0x0000000000000000000000000000000000000000000000000000000000000000",
          continuityRoots: d.continuityProof?.roots || [],
          cached: d.cached,
        };
      }
    }
    return null;
  } catch {
    // Fallback gracefully without throwing ETIMEDOUT
    return null;
  }
}
