export const CLEANVERSE_RWA_CARD_ADDRESS =
  (process.env.NEXT_PUBLIC_RWA_CARD_CONTRACT_ADDRESS as `0x${string}`) ||
  "0xdef1fc2621fc1774d0af106b3e36b9055b792ccf";

export const CLEANVERSE_RWA_CARD_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "string[]", name: "uris", type: "string[]" },
      { internalType: "string[]", name: "cvaAssetIds", type: "string[]" },
      { internalType: "bytes32[]", name: "traceabilityHashes", type: "bytes32[]" },
    ],
    name: "batchMintRWACards",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "string", name: "uri", type: "string" },
      { internalType: "string", name: "cvaAssetId", type: "string" },
      { internalType: "bytes32", name: "traceabilityHash", type: "bytes32" },
    ],
    name: "mintRWACard",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
