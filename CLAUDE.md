# CLAUDE.md — Developer Guidance & Context

> Context document for AI coding assistants and developers working on the Jolly Roger codebase.

---

## 📌 Project Summary

**Jolly Roger** is an interactive 2D gamer room web application created for the **Renaiss Protocol Hackathon**. Users explore a neon-lit gamer hideout to inspect TCG card collections, play mini-games, sign digital guestbooks, tokenize physical RWA cards on Monad Testnet, and collect digital SBTs.

---

## 🏛 Architectural Concept & Core Invariants

1. **Scene-Driven Experience**: Features are accessed via interactive furniture hotspots rather than traditional tabular dashboards. Clicking furniture smooth-zooms the camera to open dedicated modal screens.
2. **Stable Furniture Hotspot IDs**: Business logic binds to invariant Spot IDs (`phone`, `cabinet`, `computer`, `photo`, `album`, `note`) configured in [lib/spots.ts](file:///home/kafir/renaiss/lib/spots.ts).
3. **Single File per Furniture Screen**: Each object screen resides in a standalone file inside `components/scene/screens/<Xxx>Screen.tsx` accepting only `{ onClose }`.
4. **Time-of-Day Dynamic Environment**: Room image automatically switches between daytime (`room_bright_v3.png`) and nighttime (`room_dark_v3.png`) based on visitor local time.
5. **English-Only UI**: All user-facing UI copy and internal documentation must be written in English.

---

## 💻 Technical Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Web3 & Contracts**: RainbowKit / Wagmi / Viem on Monad Testnet ([CleanverseRWACard.sol](file:///home/kafir/renaiss/contracts/CleanverseRWACard.sol))
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
| **Card Cabinet** | `cabinet` | Physical TCG Collection, RWA Tokenization on Monad Testnet |
| **Computer** | `computer` | Pikachu Volleyball mini-game & Cleanverse mystery claims |
| **Photo Frame** | `photo` | Photo expansion and custom image display |
| **Note** | `note` | Interactive guestbook (Post notes & owner replies) |
| **Album** | `album` | SBT sticker collection book |
| **Snack** | `snack` | Sound easter egg trigger |
| **Figures (x5)** | `figure*` | External links to official Renaiss channels |

---

## 📁 Key File Structure

```
app/
  page.tsx                  # Main 2D room view & camera orchestrator
  api/                      # API routes (profile, sbt, cleanverse, price, upload)
components/
  scene/                    # 2D room viewport & camera logic
    Scene.tsx               #   Main camera controller & state manager
    Hotspot.tsx             #   Hotspot hover/click pop rendering & phone vibration
    LoginIntro.tsx          #   Wallet login modal
    ObjectScreen.tsx        #   Furniture spot-to-screen dispatcher
    RoomContext.tsx         #   Room state context
    screens/                #   Individual object screens
      CabinetScreen.tsx     #   Card collection & RWA tokenization
      ComputerScreen.tsx    #   Mini-game & mystery claims
      NoteScreen.tsx        #   Guestbook screen
      AlbumScreen.tsx       #   SBT album screen
      PhotoScreen.tsx       #   Photo expansion screen
      EscrowScreen.tsx      #   Escrow transaction screen
      LedgerScreen.tsx      #   Ledger activity screen
      registry.tsx          #   Spot ID to Screen component mapping registry
  ui/                       # Common UI elements (GlassPanel, StatCard, Chip, Eyebrow)
  cards/                    # Card list item components
contracts/
  CleanverseRWACard.sol     # Monad Testnet Smart Contract for RWA cards
lib/
  spots.ts                  # Hotspot coordinates, clip paths, and zoom focus points
  rooms.ts                  # Registry of public user rooms
  api/                      # Typed wrappers for external APIs
public/                     # Room artwork, game assets, and audio files
scripts/                    # Deployment & database setup scripts
```

---

## ⚠️ Important Rules & Guardrails

- **Do not commit `.env.local` or private keys.**
- **Never push directly to `main` branch.** Always create feature branches (`feat/<name>`), push to origin, and submit PRs.
- **Never hardcode hex colors or fonts**; use Tailwind tokens defined in `DESIGN.md`.
- **Do not import global state management libraries.**
- **Do not call `fetch` directly in UI components**; use typed wrappers in `lib/api/`.
