# DESIGN.md — Card Scene Design System

> **Neon Purple Gamer Room Theme (v2)**. All user interface components must strictly adhere to this document. Token definitions here match `tailwind.config.ts`.

---

## 🎨 Mood & Aesthetic

**"An otaku gamer's hideout illuminated by neon lights."**  
Dark base background with neon purple accent lighting. Designed for TCG collectors and gamers.  
*Strictly avoid pastel themes, bright white backgrounds, or corporate SaaS dashboard layouts.*

---

## 🎨 Color Tokens (`tailwind.config.ts`)

> ⚠️ Note: The `amber` token key name is maintained for backwards compatibility with component styling code, but its active color value is **Neon Purple**.

| Token Key | Color Value | Description / Usage |
|---|---|---|
| `bg` | `#07070F` | Main page background |
| `glass` | `rgba(22, 20, 40, 0.86)` | Translucent panel background (used with `backdrop-blur`) |
| `glassline` | `rgba(167, 150, 255, 0.18)` | Panel & card borders |
| `amber` | `#B78CFF` | **Primary Accent (Neon Purple)** — Highlights, active states, eyebrows |
| `ambersoft` | `rgba(183, 140, 255, 0.14)` | Stat card background & subtle glow |
| `cream` | `#EFEAFF` | Primary body text |
| `creamdim` | `#A49ECB` | Secondary / muted text |
| `up` | `#6FE8C8` | Value increase / positive state (Neon Mint) |
| `down` | `#FF8BA8` | Value decrease / negative state (Neon Pink) |
| `inkdark` | `#17102E` | Dark text rendered over accent backgrounds (e.g., active chips) |

---

## 🔤 Typography Tokens

- **Body & UI**: **Fredoka** (`font-sans`, weights 400/500/600/700) — Default font for interface elements.
- **Headings & Accents**: **Noto Serif KR** (`font-serif`, weights 500/600) — Used for modal titles and section headings.
- **Handwriting**: **Gochi Hand** (`font-hand`) — Used for handwritten guestbook notes and analog elements.
- **Pixel Art**: **Press Start 2P** (`font-pixel`) — Used for retro arcade mini-games.
- **Eyebrow Header**: 10px font size, `letter-spacing: 0.22em`, uppercase, `amber` color, weight 800 — standard via `<Eyebrow>` component.

---

## 🎬 Motion & Animation Tokens

| Motion | Duration & Timing Function |
|---|---|
| **Camera Zoom** | `transform 0.85s cubic-bezier(0.32, 0.72, 0.25, 1)` (`ease-camera`) |
| **Room Entrance** | `transform 1.8s cubic-bezier(0.22, 0.8, 0.2, 1)`, scale `0.72 → 1.0` (`ease-entrance`) |
| **Panel Transition** | `opacity` + `translate 0.45s` |
| **Hotspot Hover Pop** | Scaled overlay clip `scale(1 → 1.05)` + opacity over `0.2s` |
| **Smartphone Ringing** | `animate-ring` keyframe (shake cycle over 2.2s in [app/globals.css](file:///home/kafir/renaiss/app/globals.css)) |
| **Card Item Hover** | `translateX(3px)` + background highlight over `0.15s` |

---

## 🧩 Component Design System (`components/ui`)

- **GlassPanel**: 22px border radius (`rounded-panel`), 24px padding, backdrop blur effect. Desktop: 380px fixed side drawer. Mobile: bottom sheet drawer (max height 62vh).
- **StatCard**: `ambersoft` background, 12px radius, 10px `creamdim` label + 16px/800 value text.
- **Chip**: Pill shape (`rounded-full`). Active state uses `amber` background with `inkdark` text.
- **Eyebrow**: Uppercase section header component.
- **CardListItem**: 38x52px card thumbnail, title, grade, price, and daily change (`up`/`down` colors).
- **Hotspot**: Interactive clipping mask with a 5% pop scale and radial radial glow effect on hover/focus.

---

## 🚫 Prohibited Design Patterns

- Pure white (`#FFF`) backgrounds.
- Warm amber/gold/brown color themes (retired v1 style).
- Overused heavy drop shadows (use glass borders and backdrop blur for depth instead).
- Hardcoding custom color hexes or inline fonts outside of the defined design tokens.
