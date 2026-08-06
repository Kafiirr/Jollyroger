# Product Specification — Jolly Roger

## 🎯 Overview & Audience

**Jolly Roger** is designed for TCG (Trading Card Game) collectors, gamers, and Web3 enthusiasts who want to showcase their digital and physical card collections within an immersive 2D environment. Rather than viewing cards in a dry, tabular dashboard, users step into an **otaku gamer's hideout**. It also serves as a showcase entry for the **Renaiss Protocol Hackathon**, demonstrating high-fidelity visual design, interactive camera transitions, and seamless Web3 RWA tokenization.

---

## 💡 Product Vision & Core Purpose

The fundamental principle of Jolly Roger is: **"The Scene IS the Product."**

Every feature is accessed organically by interacting with furniture and items inside the room (such as the card cabinet, retro PC, smartphone, photo frame, and guestbook note). Clicking an item smoothly zooms the camera in to present dedicated sub-screens while maintaining the spatial immersion of the room.

---

## 🎨 Brand Identity & Aesthetics

- **Vibe**: Neon-lit, gamer hideout, cozy otaku room. Dark base background illuminated by neon accents, monitor glows, and ambient ambient light.
- **Reference Inspiration**: `anniescene.com` (scene-based zoom UX).
- **Emotional Goals**: Sense of personal sanctuary ("my digital hideout") combined with the playful discovery of interactive furniture elements.

---

## 🚫 Anti-References (What NOT to Do)

- **No Cute/Pastel Themes**: Light, pastel, or overly childish color palettes are prohibited.
- **No Generic SaaS Dashboards**: Avoid cold, corporate tables, data grids, or traditional navigation bars that destroy room immersion.
- **No Warm Gold/Amber**: Early v1 warm amber/brown concepts have been retired in favor of Neon Purple.
- **No Pure White (#FFF) Backgrounds**: All panels use translucent glassmorphic surfaces over dark backgrounds.

---

## 📐 Core Design Principles

1. **Scene-Driven Experience**: Access features via room furniture hotspots. Transforming the interface into a standard dashboard is considered a failure.
2. **Stable Spot IDs**: Logic attaches to invariant Spot IDs (`phone`, `cabinet`, `computer`, `photo`, `album`, `note`) defined in `lib/spots.ts`. Coordinate changes never break feature business logic.
3. **Isolated Object Screens**: Each furniture screen resides in its own isolated component (`screens/<Xxx>Screen.tsx`) accepting a single `{ onClose }` prop contract.
4. **Mocked Authentication & Non-Invasive Web3**: Reading public data and tokenizing cards on Monad Testnet respects user privacy and avoids intrusive wallet prompts until initiated by the user.
5. **Light Emerging from Darkness**: Palette uses deep navy/black base with neon purple (`#B78CFF`) highlights to guide visual focus naturally.

---

## ♿ Accessibility & Standards

- **Target Compliance**: Standard WCAG AA contrast for text legibility on glassmorphic panels.
- **Typography & Scale**: Clear hierarchy using Fredoka for body text and Noto Serif KR for header accents.
