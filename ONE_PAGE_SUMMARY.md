# Jolly Roger: BUIDL CTC 2026 Fall Hackathon One-Page Summary

**Hackathon**: BUIDL CTC 2026 Fall (Sponsored by Creditcoin & Credit Labs)  
**Theme**: Attestcoin Protocol (Universal Smart Contracts - USC)  
**Track**: Tokenized Real-World Assets (RWA) & Cross-Chain Infrastructure  
**Project Name**: Jolly Roger  
**Live Application**: [https://www.jollyroger.fun](https://www.jollyroger.fun)  
**GitHub Repository**: [https://github.com/Kafiirr/Jollyroger](https://github.com/Kafiirr/Jollyroger)  

---

## 🔗 Live Deployed Contracts & Infrastructure

| Network | Contract / Component | Address / Endpoint | Status / Explorer |
|---|---|---|---|
| **Creditcoin CC3 Testnet** (`102031`) | `CreditcoinRWAVaultASC` (Attestcoin Smart Contract) | `0x1a8757a621b0ac08aa91312e282307fb2e21b87f` | [Creditcoin Explorer](https://creditcoin-testnet.blockscout.com/address/0x1a8757a621b0ac08aa91312e282307fb2e21b87f) |
| **Ethereum Sepolia** (`11155111`) | `PhysicalVaultEscrow` (Source Physical Vault) | `0x0068856c80535b518dbe2a10b56e3c25f9139bb4` | [Etherscan Sepolia](https://sepolia.etherscan.io/address/0x0068856c80535b518dbe2a10b56e3c25f9139bb4) |
| **Creditcoin Precompile** | Block Prover Precompile | `0x0000000000000000000000000000000000000FD2` | Native CC3 Precompile |
| **Creditcoin Decoder** | EvmV1Decoder | `0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f` | Verified CC3 Decoder |
| **Proof Builder** | Attestcoin Proof Service | `https://proof-builder.cc3-testnet.creditcoin.network` | Active Proof Generation |

---

## 1. Problem
Tokenizing high-value physical real-world assets (RWAs)—such as certified Gem Mint graded trading cards (PSA/BGS/CGC slabs)—faces three persistent industry hurdles:
1. **The Oracle & Bridge Vulnerability**: Cross-chain RWA protocols conventionally rely on centralized multisig oracles, trusted relayers, or off-chain indexers to verify physical custody deposits on primary chains (e.g. Ethereum), introducing single points of failure and exploit vectors.
2. **Disconnected Physical Custody**: Physical vault deposits lack transparent, tamper-evident cryptographic bindings between the physical certificate and the target execution layer.
3. **Boring, Static UX & Dangerous Cross-Chain Transactions**: Most RWA platforms are uninspiring tabular spreadsheets or static galleries without protective network enforcement, leading to misrouted transactions.

---

## 2. Solution: Jolly Roger Powered by Attestcoin
**Jolly Roger** turns interactive gamer room interactions into verifiable, trustless cross-chain vaulted Real-World Assets on **Creditcoin CC3**, powered by the **Attestcoin Protocol (Universal Smart Contracts - USC)**:

- **Trustless Dual-Chain Physical Escrow**: Collectors deposit physical graded slabs into `PhysicalVaultEscrow.sol` on Ethereum Sepolia, generating cryptographic vault receipts containing serial numbers, grades, and valuations.
- **Attestcoin Precompile Verification (`0x0FD2`)**: Rather than trusting centralized bridge signers, `CreditcoinRWAVaultASC.sol` on Creditcoin CC3 directly invokes the native `BlockProverPrecompile` at `0x0000000000000000000000000000000000000FD2` and `EvmV1Decoder` (`0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f`) to mathematically verify Sepolia state roots, transaction inclusion, and event receipts (`chainKey: 1`).
- **Dynamic Live Renaiss Protocol API**: Real PSA/BGS One Piece graded cards (Luffy Gear 5 Manga, Nami OP01, Shanks, Yamato) fetched live with certification numbers and market appraisals (zero mock data).
- **Multi-Layer Web3 Network Safety (`NetworkGuard`)**: Automatically prompts wallets to switch to Creditcoin CC3 Testnet; hard-pins chain IDs on every transaction to prevent accidental transfers on wrong chains (e.g. Arbitrum/Ethereum).
- **Interactive 2D Gamer Room Experience**: Slabs are showcased in a tactile 2D collector room with smooth camera zoom focal points, a 2.0x inspection loupe, real-time FMV market valuations, an arcade mini-game with tCTC reward drops, and an on-chain guestbook with tCTC gifting.

---

## 3. Attestcoin Protocol (USC) Architecture & Flow

1. **Escrow Initiation**: User submits card details to `PhysicalVaultEscrow.sol` on Ethereum Sepolia (`0x0068...9bb4`), locking the physical item into verified custody.
2. **Proof Extraction**: The transaction hash is processed via the Attestcoin Proof Builder API (`chainKey: 1`), returning cryptographic Merkle proofs and block continuity headers.
3. **Precompile Attestation**: The user/relayer submits the proof to `CreditcoinRWAVaultASC.sol` (`0x1a8757a621b0ac08aa91312e282307fb2e21b87f`) on Creditcoin CC3.
4. **On-Chain Precompile Execution**: The contract calls native precompile `0x0000000000000000000000000000000000000FD2`. If valid, the precompile returns verified proof data decoded by `EvmV1Decoder`, minting the certified RWA token directly into the user's wallet with zero centralized trust.

---

## 4. Technical Stack & Verified Contracts

- **Execution Chain**: **Creditcoin CC3 Testnet** (Chain ID: `102031`, native currency `tCTC`).
- **Source Escrow Chain**: **Ethereum Sepolia** (Chain ID: `11155111`, native currency `SepoliaETH`).
- **Attestation Infrastructure**: Attestcoin Native Block Prover Precompile (`0x0FD2`), EvmV1Decoder (`0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f`).
- **Frontend Stack**: Next.js 14 App Router, Viem 2 & Wagmi 2 dual-chain client, Tailwind CSS with custom neon design tokens, Supabase PostgreSQL with RLS.
- **Valuation & Metadata**: Live Renaiss Protocol API (`api.renaiss.xyz/v0/`), real-time market pricing with high-res card scans.
