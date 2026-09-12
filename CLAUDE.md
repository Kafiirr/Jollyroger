# CLAUDE.md — Developer Guidance & Context

> Context document for AI coding assistants and developers working on the Jolly Roger codebase.

---

## 📌 Project Summary

**Jolly Roger** is an interactive 2D gamer room web application created for the **BUIDL CTC 2026 Fall Hackathon** (Creditcoin & Credit Labs). Users explore a neon-lit gamer hideout to inspect TCG card collections, play mini-games, sign digital guestbooks, tokenize physical RWA cards across Ethereum Sepolia and Creditcoin CC3 Testnet using the **Attestcoin Protocol (Universal Smart Contracts - USC)**, and collect digital SBTs.

---

## 🏛 Architectural Concept & Core Invariants

1. **Scene-Driven Experience**: Features are accessed via interactive furniture hotspots rather than traditional tabular dashboards. Clicking furniture smooth-zooms the camera to open dedicated modal screens.
2. **Stable Furniture Hotspot IDs**: Business logic binds to invariant Spot IDs (`phone`, `cabinet`, `computer`, `photo`, `album`, `note`, `escrow`, `ledger`) configured in [lib/spots.ts](file:///home/kafir/renaiss/lib/spots.ts).
3. **Single File per Furniture Screen**: Each object screen resides in a standalone file inside `components/scene/screens/<Xxx>Screen.tsx` accepting only `{ onClose }`.
4. **Time-of-Day Dynamic Environment**: Room image automatically switches between daytime (`room_bright_v3.png`) and nighttime (`room_dark_v3.png`) based on visitor local time.
5. **English-Only UI**: All user-facing UI copy and internal documentation must be written in English.

---

## 💻 Technical Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Web3 & Contracts**: RainbowKit / Wagmi / Viem on Creditcoin CC3 Testnet (`CreditcoinRWAVaultASC.sol` at `0x1a8757a621b0ac08aa91312e282307fb2e21b87f`) & Ethereum Sepolia (`PhysicalVaultEscrow.sol` at `0x0068856c80535b518dbe2a10b56e3c25f9139bb4`)
- **Safety & Enforcement**: Global NetworkGuard (`components/ui/NetworkGuard.tsx`) auto-prompting CC3 (`102031`) with action-level chain hard-pinning
- **Cross-Chain Attestation**: Creditcoin Native Block Prover Precompile (`0x0000000000000000000000000000000000000FD2`) & EvmV1Decoder (`0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f`)
- **Styling**: Tailwind CSS with custom design tokens (see [DESIGN.md](file:///home/kafir/renaiss/DESIGN.md))
- **State Management**: React Context API & useState (no global state library overhead)
- **Database**: Supabase (PostgreSQL with RLS) for guestbook entries and claims
- **Storage**: Cloudflare R2 direct pre-signed client uploads
- **Deployment**: Vercel

---

## 🛋 Furniture Hotspot Mapping

| Object | Spot ID | Functionality |
|---|---|---|
| **Smartphone** | `phone` | Wallet login gate & session logout |
| **Card Cabinet** | `cabinet` | Physical TCG Collection, RWA Tokenization on Creditcoin CC3 |
| **Computer** | `computer` | Pikachu Volleyball mini-game & Creditcoin card drops |
| **Photo Frame** | `photo` | Photo expansion and custom image display |
| **Note** | `note` | Interactive guestbook (Post notes & tCTC tips) |
| **Album** | `album` | SBT sticker collection book & Creditcoin Provenance Passport |
| **Vault Escrow** | `escrow` | Attestcoin Cross-Chain Physical Vault Deposit (Sepolia -> CC3) |
| **Ledger** | `ledger` | Attestcoin Precompile Verification Ledger & Block Proofs |
| **Snack** | `snack` | Sound easter egg trigger |
| **Figures (x5)** | `figure*` | External links to official channels |

---

## 📁 Key File Structure

```
app/
  page.tsx                  # Main 2D room view & camera orchestrator
  api/                      # API routes (profile, sbt, attestcoin, price, upload)
components/
  scene/                    # 2D room viewport & camera logic
    Scene.tsx               #   Main camera controller & state manager
    Hotspot.tsx             #   Hotspot hover/click pop rendering & phone vibration
    LoginIntro.tsx          #   Wallet login modal
    ObjectScreen.tsx        #   Furniture spot-to-screen dispatcher
    RoomContext.tsx         #   Room state context
    screens/                #   Individual object screens
      CabinetScreen.tsx     #   Card collection & Creditcoin CC3 minting
      ComputerScreen.tsx    #   Mini-game & Creditcoin card drops
      NoteScreen.tsx        #   Guestbook screen & tCTC tips
      AlbumScreen.tsx       #   SBT album screen & Creditcoin Passport
      PhotoScreen.tsx       #   Photo expansion screen
      EscrowScreen.tsx      #   Attestcoin cross-chain vault escrow (Sepolia -> CC3)
      LedgerScreen.tsx      #   Attestcoin Precompile 0x0FD2 provenance ledger
      registry.tsx          #   Spot ID to Screen component mapping registry
  ui/                       # Common UI elements (GlassPanel, StatCard, Chip, Eyebrow, AttestcoinStatus)
  cards/                    # Card list item components
contracts/
  CreditcoinRWAVaultASC.sol # Creditcoin CC3 Testnet Attestcoin Smart Contract (0x0FD2 Precompile)
  PhysicalVaultEscrow.sol   # Ethereum Sepolia Physical Custody Vault Escrow
lib/
  spots.ts                  # Hotspot coordinates, clip paths, and zoom focus points
  rooms.ts                  # Registry of public user rooms
  api/                      # Typed wrappers for external APIs (attestcoin, prices, etc.)
  contracts/                # Contract ABIs and network constants
public/                     # Room artwork, game assets, and audio files
scripts/                    # Deployment scripts for Creditcoin and Sepolia
```

---

## ⚠️ Important Rules & Guardrails

- **Do not commit `.env.local` or private keys.**
- **Never push directly to `main` branch.** Always create feature branches (`feat/<name>`), push to origin, and submit PRs.
- **Never hardcode hex colors or fonts**; use Tailwind tokens defined in `DESIGN.md`.
- **Do not import global state management libraries.**
- **Do not call `fetch` directly in UI components**; use typed wrappers in `lib/api/`.
