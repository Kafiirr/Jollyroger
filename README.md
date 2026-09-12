# Jolly Roger 🏴‍☠️

An interactive 2D gamer room web application for showcasing TCG card collections, playing retro mini-games, managing digital guestbooks, and tokenizing physical RWA cards across **Ethereum Sepolia** and **Creditcoin CC3 Testnet** via the **Attestcoin Protocol (Universal Smart Contracts - USC)**. Created for the **BUIDL CTC 2026 Fall Hackathon** (Creditcoin & Credit Labs).

**🔗 Live Demo: [https://www.jollyroger.fun](https://www.jollyroger.fun)**  
**🐙 GitHub: [https://github.com/Kafiirr/Jollyroger](https://github.com/Kafiirr/Jollyroger)**

> The room scene itself IS the product. Instead of a conventional list/grid SaaS dashboard, users interact with furniture hotspots inside a neon-lit gamer hideout to trigger specific feature screens with dynamic camera transitions.

---

## 🚀 Live Smart Contracts & Infrastructure

| Network | Contract Name / Component | Address / Endpoint | Explorer |
|---|---|---|---|
| **Creditcoin CC3 Testnet** (Chain ID: `102031`) | `CreditcoinRWAVaultASC` (Attestcoin Smart Contract) | `0x1a8757a621b0ac08aa91312e282307fb2e21b87f` | [Creditcoin Explorer](https://creditcoin-testnet.blockscout.com/address/0x1a8757a621b0ac08aa91312e282307fb2e21b87f) |
| **Ethereum Sepolia** (Chain ID: `11155111`) | `PhysicalVaultEscrow` (Source Physical Vault) | `0x0068856c80535b518dbe2a10b56e3c25f9139bb4` | [Etherscan Sepolia](https://sepolia.etherscan.io/address/0x0068856c80535b518dbe2a10b56e3c25f9139bb4) |
| **Creditcoin Precompile** | Block Prover Precompile | `0x0000000000000000000000000000000000000FD2` | Native CC3 Precompile |
| **Creditcoin Decoder** | EvmV1Decoder | `0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f` | Verified CC3 Decoder |
| **Proof Builder** | Attestcoin Proof Service | `https://proof-builder.cc3-testnet.creditcoin.network` | Active Proof API |

---

## 🚀 Getting Started

```bash
# 1. Clone repository and install dependencies
git clone https://github.com/Kafiirr/Jollyroger.git
cd Jollyroger
npm install

# 2. Copy environment variable template and fill in your keys
cp .env.example .env.local

# 3. Start local development server
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- **Web3 & Smart Contracts**:
  - Creditcoin CC3 Testnet & Ethereum Sepolia dual-chain integration via `viem`, `wagmi`, and RainbowKit
  - Cross-Chain Block Prover Precompile (`0x0FD2`) verification for physical vault deposits
  - Smart Contracts: [`CreditcoinRWAVaultASC.sol`](file:///home/kafir/renaiss/contracts/CreditcoinRWAVaultASC.sol) & [`PhysicalVaultEscrow.sol`](file:///home/kafir/renaiss/contracts/PhysicalVaultEscrow.sol)
- **Styling & Design System**:
  - [Tailwind CSS](https://tailwindcss.com/) with a curated Dark Base + Neon Purple design system
  - **Typography**: Fredoka (UI/Body), Noto Serif KR (Headings), Gochi Hand (Guestbook handwriting), Press Start 2P (Pixel art)
- **Database & Storage**:
  - [Supabase](https://supabase.com/) (PostgreSQL with RLS) for guestbooks, daily claims, and user profiles
  - [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) for direct client-side media uploads
- **State & Motion**: React Context API & pure CSS keyframe transitions (`animate-ring`, camera zoom)
- **Deployment**: Vercel

---

## 🔮 Key Experience & Features

### 1. Smartphone Login Gate & Web3 Identity 📱
Upon opening the application, users arrive in a dark room (`main.png`) where only a smartphone vibrates and glows. Clicking the phone opens the Web3 login modal featuring custom single-line Web3 pills (active emerald chain indicator, truncated monospace address, avatar preview), unlocks interactive room hotspots, and verifies the user's on-chain **Creditcoin Provenance ID** (`CTC-CC3-${address}`).

### 2. Attestcoin Cross-Chain Vault Escrow (`escrow` hotspot) 🛡️
Collectors lock physical authenticated graded collectibles (PSA/BGS Gem Mint slabs) into `PhysicalVaultEscrow.sol` on Ethereum Sepolia. Using the **Attestcoin Protocol**, `CreditcoinRWAVaultASC.sol` queries Creditcoin's native **Block Prover Precompile (`0x0FD2`)** via `staticcall` to cryptographically prove the Sepolia deposit and mint verified RWA provenance on Creditcoin CC3—with **zero centralized bridge oracles**.

### 3. Multi-Layer Web3 Safety & Automatic Network Switching ⚡
- **Global NetworkGuard (`components/ui/NetworkGuard.tsx`)**: Automatically detects when a wallet is on an unsupported chain (e.g., Arbitrum, Mainnet) and prompts the wallet to switch to Creditcoin CC3 Testnet (`102031`).
- **Transaction-Level Guardrails**: Guestbook tCTC gifts and Escrow interactions hard-pin expected chain IDs and halt execution if the user rejects network switching, preventing accidental cross-chain token transfers.

### 4. Dynamic Live Renaiss Protocol Integration 🎴
Every single graded slab, cert number, appraisal valuation, and image displayed in Jolly Roger is dynamically sourced in real time from the **Renaiss Protocol API** (`api.renaiss.xyz/v0/`):
- Real One Piece TCG authenticated slabs (Luffy Manga, Nami OP01, Shanks, Yamato).
- Direct high-resolution slab inspection links ("View the Card").
- 1x/day claim limits with real-time ticking countdown timers persisted in Supabase.

### 5. Time-of-Day Dynamic Theme ☀️🌙
The room automatically adapts to the visitor's local time:
- **Daytime (06:00 – 17:59)**: Sunlit bright room environment (`room_bright_v3.png`)
- **Nighttime (18:00 – 05:59)**: Dimly lit dark room environment (`room_dark_v3.png`)
*(Override with `?hour=12` or `?hour=22`).*

### 6. Retro Arcade & Proof-of-Play Minigame (`computer` hotspot) 🕹️
Collectors play retro arcade mini-games to earn verified game rewards and Creditcoin CC3 tCTC drops.

---

## 🛋️ Furniture & Hotspot Mappings

Hotspots are mapped to stable Spot IDs defined in [lib/spots.ts](file:///home/kafir/renaiss/lib/spots.ts).

| Furniture / Object | Spot ID | Functionality |
|---|---|---|
| **Smartphone** | `phone` | Wallet login gate, custom Web3 pills & Creditcoin Provenance ID |
| **Card Cabinet** | `cabinet` | Physical TCG Card Collection, RWA Tokenization on Creditcoin CC3 |
| **Computer** | `computer` | Pikachu Volleyball mini-game & Creditcoin card drops |
| **Photo Frame** | `photo` | Expanded photo view & custom artwork display |
| **Album** | `album` | Digital SBT sticker collection book & Creditcoin Passport |
| **Vault Escrow** | `escrow` | Attestcoin Cross-Chain Physical Vault Deposit (Sepolia -> CC3) |
| **Ledger** | `ledger` | Attestcoin Precompile 0x0FD2 provenance ledger & block proofs |
| **Note** | `note` | Interactive Guestbook with owner replies & tCTC tips |
| **Snack Bag** | `snack` | Audio easter egg trigger |
| **Desk Figures (x5)** | `figure*` | Direct links to official community channels |

---

## 📡 Data Sources & Integrations

- **Attestcoin Block Prover Precompile (`0x0FD2`)**: Cryptographic cross-chain state verification on Creditcoin CC3
- **Renaiss API**: Public profile, avatar, showcase, and dynamic One Piece TCG cards ([lib/api/renaiss.ts](file:///home/kafir/renaiss/lib/api/renaiss.ts))
- **apitcg.com**: Card metadata and images ([lib/api/apitcg.ts](file:///home/kafir/renaiss/lib/api/apitcg.ts))
- **Supabase**: Remote guestbook storage, user profiles, & daily claim rate limits ([lib/supabase.ts](file:///home/kafir/renaiss/lib/supabase.ts))
- **PokemonPriceTracker**: Real-time physical card market valuation ([lib/api/prices.ts](file:///home/kafir/renaiss/lib/api/prices.ts))

---

## 📁 Repository Structure

```
app/
  page.tsx                  # Main 2D Scene viewport & camera controller
  api/                      # Next.js API routes (profile, sbt, attestcoin, price, upload)
components/
  scene/                    # 2D Scene, hotspot interactions, & camera orchestrator
    Scene.tsx               #   Main camera controller & state dispatcher
    Hotspot.tsx             #   Hotspot hover/click pop rendering & phone vibration
    LoginIntro.tsx          #   Web3 wallet login modal (Custom single-line pills)
    ObjectScreen.tsx        #   Furniture spot-to-screen dispatcher
    RoomContext.tsx         #   Room state context
    screens/                #   Individual object screens (Cabinet, Computer, Note, Album, Escrow, Ledger)
      registry.tsx          #   Spot ID to Screen component registry
  ui/                       # Reusable UI elements (NetworkGuard, GlassPanel, StatCard, Chip, Eyebrow, AttestcoinStatus)
  cards/                    # Card list and showcase components
contracts/                  # Solidity smart contracts (CreditcoinRWAVaultASC.sol, PhysicalVaultEscrow.sol)
lib/
  spots.ts                  # Hotspot coordinates, clip paths, and zoom focal points
  rooms.ts                  # Registry of public rooms and demo accounts
  api/                      # Server-side external API wrappers
public/                     # Image assets (room backgrounds, game assets, sounds)
scripts/                    # Contract deployment and database migration scripts
```

---

## ⚙️ URL Query Parameters

- `?room=<id>`: Load specific collector's room (e.g., `?room=ari`).
- `?hour=<0-23>`: Force specific hour of the day to demonstrate day/night transition.
- `?edit`: Open developer hotspot coordinate & clip path editor.

---

## 📜 Development Guidelines

- **Always use English for code, comments, and UI copy.**
- Do not commit `.env.local` or private keys.
- Do not make direct commits to `main`; work on feature branches and submit PRs.
- Refer to [CLAUDE.md](file:///home/kafir/renaiss/CLAUDE.md) for detailed architectural context and [DESIGN.md](file:///home/kafir/renaiss/DESIGN.md) for design system tokens.
