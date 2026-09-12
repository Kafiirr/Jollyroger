export const CREDITCOIN_RWA_VAULT_ADDRESS =
  (process.env.NEXT_PUBLIC_CREDITCOIN_VAULT_ADDRESS as `0x${string}`) ||
  "0x1a8757a621b0ac08aa91312e282307fb2e21b87f";

export const SEPOLIA_ESCROW_ADDRESS =
  (process.env.NEXT_PUBLIC_SEPOLIA_ESCROW_ADDRESS as `0x${string}`) ||
  "0x0068856c80535b518dbe2a10b56e3c25f9139bb4";

export const CREDITCOIN_RWA_VAULT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_decoderAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_sourceVaultAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startTokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      }
    ],
    "name": "BatchCardsMinted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "cardName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "grade",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "certNumber",
        "type": "uint256"
      }
    ],
    "name": "DirectCardMinted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "certNumber",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "cardName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "appraisalUsd",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "queryKey",
        "type": "bytes32"
      }
    ],
    "name": "RWACardAttested",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BLOCK_PROVER_ADDRESS",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DECODER",
    "outputs": [
      {
        "internalType": "contract IEvmV1Decoder",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "EXPECTED_CHAIN_KEY",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "VERIFIER",
    "outputs": [
      {
        "internalType": "contract INativeQueryVerifier",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "certNumber",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "cardName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "grade",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "appraisalUsd",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "uri",
            "type": "string"
          }
        ],
        "internalType": "struct CreditcoinRWAVaultASC.CardMetadata[]",
        "name": "cards",
        "type": "tuple[]"
      }
    ],
    "name": "batchMintCards",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "tokenIds",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "cardDetails",
    "outputs": [
      {
        "internalType": "address",
        "name": "originalOwner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "certNumber",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "cardName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "grade",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "appraisalUsd",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "sourceTxHash",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "attestedAt",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "crossChainVerified",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "cardName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "grade",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "certNumber",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "appraisalUsd",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "uri",
        "type": "string"
      }
    ],
    "name": "mintDirectCard",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ownerOf",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "processedQueries",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "chainKey",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "blockHeight",
        "type": "uint64"
      },
      {
        "internalType": "bytes",
        "name": "encodedTransaction",
        "type": "bytes"
      },
      {
        "internalType": "bytes32",
        "name": "merkleRoot",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "value",
            "type": "bytes32"
          },
          {
            "internalType": "bool",
            "name": "isLeft",
            "type": "bool"
          }
        ],
        "internalType": "struct INativeQueryVerifier.MerkleProofEntry[]",
        "name": "siblings",
        "type": "tuple[]"
      },
      {
        "internalType": "bytes32",
        "name": "lowerEndpointDigest",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32[]",
        "name": "continuityRoots",
        "type": "bytes32[]"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "certNumber",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "cardName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "grade",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "appraisalUsd",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "uri",
            "type": "string"
          }
        ],
        "internalType": "struct CreditcoinRWAVaultASC.CardMetadata",
        "name": "card",
        "type": "tuple"
      }
    ],
    "name": "proveAndVaultCard",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_sourceVault",
        "type": "address"
      }
    ],
    "name": "setSourceVault",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sourceVaultAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "tokenURI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalVaultedCards",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const SEPOLIA_ESCROW_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "certNumber", type: "uint256" },
      { internalType: "string", name: "cardName", type: "string" },
      { internalType: "string", name: "grade", type: "string" },
      { internalType: "uint256", name: "appraisalUsd", type: "uint256" },
    ],
    name: "vaultCard",
    outputs: [{ internalType: "uint256", name: "vaultId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
