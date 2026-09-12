# Product Specification — Jolly Roger 🏴‍☠️

## 🎯 Overview & Audience

**Jolly Roger** is an interactive 2D gamer room web application designed for TCG (Trading Card Game) collectors, Web3 enthusiasts, and RWA innovators. Built specifically for the **BUIDL CTC 2026 Fall Hackathon** (Creditcoin & Credit Labs), it bridges physical graded trading card collectibles into trustless on-chain Real-World Assets (RWAs) on **Creditcoin CC3 Testnet** via the **Attestcoin Protocol (Universal Smart Contracts - USC)** and dynamic live provenance from the **Renaiss Protocol API**.

- **Hackathon**: BUIDL CTC 2026 Fall (Creditcoin & Credit Labs)
- **Track**: Tokenized Real-World Assets (RWA) & Cross-Chain Infrastructure
- **Theme**: Attestcoin Protocol (Universal Smart Contracts - USC)
- **Target Audience**: TCG collectors (One Piece, Pokémon), Web3 gamers, and DeFi/RWA asset managers.

---

## 💡 Product Vision & Core Purpose

The fundamental principle of Jolly Roger is: **"The Scene IS the Product."**

Rather than navigating a cold, spreadsheet-like SaaS dashboard, users step into an authentic, neon-lit otaku gamer sanctuary. Every functionality is accessed organically by interacting with furniture hotspots:
- **Card Cabinet (`cabinet`)**: Physical PSA/BGS One Piece slab showcase, appraisal data, and CC3 RWA minting.
- **Retro PC (`computer`)**: Proof-of-play arcade mini-game with Creditcoin CC3 tCTC reward drops.
- **Smartphone (`phone`)**: Web3 wallet login gate, profile setup, and Creditcoin Provenance ID.
- **Vault Escrow (`escrow`)**: Cross-chain custody escrow on Ethereum Sepolia & Block Prover Precompile (`0x0FD2`) attestation on CC3.
- **Chain-of-Custody Ledger (`ledger`)**: Cryptographic provenance verification with block continuity receipts.
- **Guestbook Note (`note`)**: Interactive room visitor messages with direct on-chain tCTC gifting.
- **Trophy Album (`album`)**: Digital Soulbound Token (SBT) passport and attestation certificates.

---

## 🏛 Attestcoin Protocol (USC) Integration

Jolly Roger mathematically proves physical custody deposits across chains without centralized bridge signers or multisig oracles:

1. **Sepolia Custody Escrow**: Physical cards are locked into `PhysicalVaultEscrow.sol` on Ethereum Sepolia (`11155111`).
2. **Proof Builder Extraction**: Transaction receipts and Merkle Patricia inclusion proofs are processed via Attestcoin Proof Builder API (`chainKey: 1`).
3. **Precompile Verification**: `CreditcoinRWAVaultASC.sol` on Creditcoin CC3 Testnet queries the native **Block Prover Precompile (`0x0000000000000000000000000000000000000FD2`)** via `staticcall` to validate Sepolia block roots and receipts.
4. **Decoded Attestation**: The payload is decoded on-chain via `EvmV1Decoder` (`0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f`), minting verified RWA tokens with immutable provenance.

---

## 🎴 Dynamic Renaiss Protocol Integration (Zero Mock Data)

All graded slab certifications, high-resolution card artwork, and Fair Market Valuations (FMV) are dynamically queried live from the **Renaiss Protocol API** (`api.renaiss.xyz/v0/`):
- Dynamic One Piece TCG cards (Luffy Gear 5 Manga, Nami OP01, Shanks, Zoro, Yamato).
- PSA/BGS certification numbers, sub-grades, and live appraisals.
- High-definition card inspection ("View the Card").

---

## 🛡️ Web3 Safety & Network Enforcement

1. **Global NetworkGuard (`components/ui/NetworkGuard.tsx`)**:
   - Detects unsupported chains (Arbitrum, Mainnet, etc.) and auto-prompts the wallet to switch to Creditcoin CC3 Testnet (`102031`).
   - Floating banner with one-click network switcher.
2. **Action-Level Network Pinning**:
   - **Guestbook Gifting**: Strictly enforces Creditcoin CC3 Testnet (`102031`) before sending transactions; hard-pins `chainId: 102031` to prevent cross-chain misrouting.
   - **Cross-Chain Escrow**: Enforces Ethereum Sepolia (`11155111`) for Step 1 vaulting, and switches to Creditcoin CC3 (`102031`) for Step 3 attestation.
3. **Daily Claim Limits & Cooldowns**:
   - Stored in Supabase (`daily_mystery_claims`) with real-time countdown timers.

---

## 🎨 Brand Identity & Aesthetics

- **Vibe**: Neon-lit otaku gamer sanctuary, cozy retro-futuristic collector hideout.
- **Color Tokens**: Deep dark base (`#0E0C17`, `#17102E`) illuminated by neon purple accents (`#B78CFF`), emerald success pulses, and soft glassmorphic backdrops.
- **Reference Inspiration**: `anniescene.com` (scene-based zoom UX).
- **Typography**: Fredoka (UI/Body), Noto Serif KR (Headings), Gochi Hand (Guestbook handwriting), Press Start 2P (Retro mini-game).

---

## 🚫 Anti-References (What NOT to Do)

- **No Generic SaaS Dashboards**: Avoid cold tables, data grids, or traditional navbars that break room immersion.
- **No Cute/Pastel Themes**: Light, pastel, or overly childish palettes are prohibited.
- **No Centralized Oracles**: Never rely on off-chain multisig bridges for cross-chain custody.
- **No Pure White Backgrounds**: All panels use translucent glassmorphic surfaces over dark backgrounds.
