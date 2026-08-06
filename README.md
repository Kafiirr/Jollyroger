# Jolly Roger 🏴‍☠️

An interactive 2D gamer room web application for showcasing TCG card collections, playing retro mini-games, managing digital guestbooks, and tokenizing physical RWA cards on the Monad Testnet via Cleanverse Protocol. Created for the **Renaiss Protocol Hackathon**.

**🔗 Live Demo: [https://www.jollyroger.fun](https://www.jollyroger.fun)**

> The room scene itself IS the product. Instead of a conventional list/grid SaaS dashboard, users interact with furniture hotspots inside a neon-lit gamer hideout to trigger specific feature screens with dynamic camera transitions.

---

## 🚀 Getting Started

```bash
# 1. Clone repository and install dependencies
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
  - Monad Testnet deployment via `viem`, `wagmi`, and RainbowKit
  - Cleanverse RWA Card Smart Contract ([CleanverseRWACard.sol](file:///home/kafir/renaiss/contracts/CleanverseRWACard.sol))
- **Styling & Design System**:
  - [Tailwind CSS](https://tailwindcss.com/) with a curated Dark Base + Neon Purple design system
  - **Typography**: Fredoka (UI/Body), Noto Serif KR (Headings), Gochi Hand (Guestbook handwriting), Press Start 2P (Pixel art)
- **Database & Storage**:
  - [Supabase](https://supabase.com/) (PostgreSQL with RLS) for guestbooks and mystery claim data
  - [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) for direct client-side media uploads
- **State & Motion**: React Context API & pure CSS keyframe transitions (`animate-ring`, camera zoom)
- **Deployment**: Vercel

---

## 🔮 Key Experience & Features

### 1. Smartphone Login Gate 📱
Upon opening the application, users arrive in a dark room (`main.png`) where only a smartphone vibrates and glows to a rhythmic ring. Clicking the phone opens the Web3 wallet login modal (RainbowKit / Mock fallback), which brightens the room and unlocks interactive furniture hotspots.

### 2. Time-of-Day Dynamic Theme ☀️🌙
The room automatically adapts to the visitor's local time:
- **Daytime (06:00 – 17:59)**: Sunlit bright room environment (`room_bright_v3.png`)
- **Nighttime (18:00 – 05:59)**: Dimly lit dark room environment (`room_dark_v3.png`)

> *Note: Override the theme for testing by appending `?hour=12` (day) or `?hour=22` (night) to the URL.*

### 3. Room Visits 🚪
Visitors can browse other collectors' customized rooms using the `?room=<id>` query parameter (e.g., `?room=ari`). Visiting someone else's room presents a read-only view of their collection, SBTs, and guestbook.

---

## 🛋️ Furniture & Hotspot Mappings

Hotspots are mapped to stable Spot IDs defined in [lib/spots.ts](file:///home/kafir/renaiss/lib/spots.ts).

| Furniture / Object | Spot ID | Functionality |
|---|---|---|
| **Smartphone** | `phone` | Wallet login gate & session logout |
| **Card Cabinet** | `cabinet` | Physical TCG Card Collection, RWA Tokenization on Monad Testnet |
| **Computer** | `computer` | Pikachu Volleyball mini-game & Cleanverse mystery claims |
| **Photo Frame** | `photo` | Expanded photo view & custom artwork display |
| **Album** | `album` | Digital SBT sticker collection book |
| **Note** | `note` | Interactive Guestbook with owner replies |
| **Snack Bag** | `snack` | Audio easter egg trigger |
| **Desk Figures (x5)** | `figure*` | Direct links to Renaiss official channels |

---

## 📡 Data Sources & Integrations

- **Renaiss API**: Public profile, avatar, showcase, and SBT data ([lib/api/renaiss.ts](file:///home/kafir/renaiss/lib/api/renaiss.ts))
- **apitcg.com**: One Piece TCG card metadata and images ([lib/api/apitcg.ts](file:///home/kafir/renaiss/lib/api/apitcg.ts))
- **Supabase**: Remote guestbook storage & daily mystery claims ([lib/supabase.ts](file:///home/kafir/renaiss/lib/supabase.ts))
- **PokemonPriceTracker**: Real-time physical card market valuation with pokemontcg.io fallbacks ([lib/api/prices.ts](file:///home/kafir/renaiss/lib/api/prices.ts))

---

## 📁 Repository Structure

```
app/
  page.tsx                  # Main 2D Scene viewport & camera controller
  api/                      # Next.js API routes (profile, sbt, cleanverse, price, upload)
components/
  scene/                    # 2D Scene, hotspot interactions, & camera orchestrator
    Scene.tsx               #   Main camera controller & state dispatcher
    Hotspot.tsx             #   Hotspot hover/click pop rendering & phone vibration
    LoginIntro.tsx          #   Web3 wallet login modal
    ObjectScreen.tsx        #   Furniture spot-to-screen dispatcher
    RoomContext.tsx         #   Room state context
    screens/                #   Individual object screens (Cabinet, Computer, Note, Album, etc.)
      registry.tsx          #   Spot ID to Screen component registry
  ui/                       # Reusable UI elements (GlassPanel, StatCard, Chip, Eyebrow)
  cards/                    # Card list and showcase components
contracts/                  # Solidity smart contracts (CleanverseRWACard.sol)
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
