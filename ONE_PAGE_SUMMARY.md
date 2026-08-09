# Jolly Roger: Cleanverse Hackathon One-Page Summary

**Track**: Track 1 — Real World Assets (RWA)  
**Project Name**: Jolly Roger  
**GitHub Repository**: [https://github.com/Kafiirr/Jollyroger](https://github.com/Kafiirr/Jollyroger)  
**Deployed Network**: Monad Testnet (Chain ID: `10143`)  
**Smart Contract**: [`0xddb7e56f23621627e60258ad466a1958940774e1`](https://testnet.monadexplorer.com/address/0xddb7e56f23621627e60258ad466a1958940774e1)  

---

## 1. Problem
Tokenizing high-value physical real-world assets (RWAs)—such as professionally graded collectible trading cards (PSA/BGS/CGC Gem Mint slabs)—faces three fundamental barriers:
1. **Provenance & Trust Gap**: Physical assets often lack verifiable cryptographic custody and tamper-evident audit trails between physical vaults and on-chain tokens.
2. **Friction in Compliance & Onboarding**: Traditional institutional KYC/AML compliance is clunky and alienates collectors, preventing seamless digital participation.
3. **Disconnected Valuation & Liquidity**: Most RWA NFTs are static images disconnected from real-time secondary market liquidity and certified valuation indices.

---

## 2. Solution: Jolly Roger
**Jolly Roger** turns interactive gamified actions (proof-of-play) into compliant, verifiable on-chain vaulted Real World Assets on **Monad**, anchored directly to the **Cleanverse Compliance & Verification Protocol** and **RenaissOS Market Index**:

- **Proof-of-Play Onboarding**: Players interact with retro-futuristic arcade challenges and room cleaning tasks to earn physical-backed graded card drops.
- **Instant Cleanverse CVI Registration**: Every connecting wallet is automatically verified or registered on-chain with a **Cleanverse A-Pass** (Tier 50 / Sub-tier 10).
- **On-Chain Batch Minting**: Slabs are batch-minted to Monad Testnet using gas-optimized smart contracts carrying tamper-evident metadata and traceability hashes.
- **Interactive 3D Cabinet & Loupe Inspector**: Slabs are showcased in a tactile 3D room with a 2.0× high-definition magnifying lens, real-time FMV valuations, and secondary market provenance links.
- **Traceability Archive & Daily Mystery Drops**: An immutable custodial ledger tracks all on-chain mints, certified grading credentials, and compliance checks.

---

## 3. CVI · CVA · CCP Integration Points (Track 1 RWA)

### A. CVI (Cleanverse Verified Identity / A-Pass)
- **Live Gateway Integration**: Directly connected to the official Cleanverse Cooperate Gateway (`https://uatapi.cleanverse.com/api/cooperate`) with partner credentials (`APP20260614112550LIDZXM`).
- **Encrypted On-Chain Registration**: Implements AES-256-CBC encryption (16-zero-byte IV + base64 key) to call `POST /generate_apass`, issuing real on-chain Monad A-Passes (*Live UAT Record: `cvRecordId: 2044 / 2048`, Tier 50, US tag*).
- **Live Verification**: Queries `POST /query_apass` and `POST /query_apass_list` to enforce compliance before unlocking minting or vault interactions.
- **Cryptographic Binding**: Every slab links the player's A-Pass and wallet with a deterministic `cvaAssetId` and on-chain `traceabilityHash` generated via `keccak256(cvaAssetId : cardName : certNumber : walletAddress : timestamp)`.

### B. CVA (Cleanverse Verified Assets / A-Token & Valuation)
- **Compliant RWA Architecture**: Slabs strictly implement Cleanverse asset standards (`cleanOrigination: true`, `accreditedOnly: true`, physical vault audit report linkage).
- **Real-Time FMV Indexing**: Live Fair Market Value (FMV) pricing is dynamically queried from **RenaissOS v1 Market Indices** (`/v1/indices/one-piece`, `/v1/search`), mapping institutional-grade valuations directly to on-chain tokens.
- **Secondary Market Provenance**: Every slab includes direct verification deep-links to live secondary market trading records (`https://renaissos.com/card/...`).

### C. CCP (Cleanverse Compliance Protocol)
- **Pre-Transaction Compliance**: Pre-transaction rule verification executes via `verifyCCPTransaction`, ensuring all room and trading activities pass travel rule and risk checks (`Risk Score: 0/100`).
- **Traceability Ledger**: All custodial events and slab mints are logged immutably in the in-app Traceability Archive.

---

## 4. Deployed Chain & Technical Architecture
- **Target Blockchain**: **Monad Testnet** (Chain ID: `10143`, 10,000 TPS, sub-second finality).
- **Smart Contract**: `0xddb7e56f23621627e60258ad466a1958940774e1` (`batchMintRWACards` & `mintRWACard`).
- **Cleanverse Protocol Gateway**: `https://uatapi.cleanverse.com/api/cooperate` (Sandbox App ID: `APP20260614112550LIDZXM`).
- **Full Stack Architecture**: Next.js 14 App Router, Viem & Wagmi, Supabase PostgreSQL, RenaissOS v1 Protocol (with in-memory TTL caching).
