# AGENTS.md — AI Agent & Developer Guardrails

> Primary entry document for AI coding assistants (Codex, Claude, etc.).
> **Refer to [CLAUDE.md](CLAUDE.md) for full context and [DESIGN.md](DESIGN.md) for design tokens.**

---

## ⛔ Git Workflow & Conflict Prevention (STRICTLY ENFORCED)

> **CRITICAL RULE**: Never drag-and-drop upload files via GitHub web interface. All file additions and modifications must be performed exclusively via local Git.

- **Direct commits/pushes to `main` are PROHIBITED.** Always work in feature branches:
  ```bash
  git checkout main && git pull
  git checkout -b feat/<feature-name>
  # Modify code in local workspace...
  git add <specific-files>
  git commit -m "feat: descriptive commit message"
  git push -u origin feat/<feature-name>
  ```
- **Check Staged Files Before Committing**: Run `git status` to ensure `node_modules`, `.env*`, build artifacts (`.next/`, `build/`), and tooling config are NOT staged.
- **Do NOT manually edit `package-lock.json` or `tsconfig.json`.** Modify dependencies via `npm install <package>`.
- **Keep PRs modular**: One feature / screen per branch.

---

## 📐 Non-Negotiable Development Rules

### 1. File Isolation per Furniture Object
- Work inside your specific object screen file (`components/scene/screens/<Xxx>Screen.tsx`).
- Props contract for screen components is strictly `{ onClose }`.
- Do not modify shared layout files (`Scene.tsx`, `ObjectScreen.tsx`, `lib/spots.ts`, `screens/ScreenShell.tsx`, `screens/registry.tsx`) unless authorized.
- To register a new object: add `<Xxx>Screen.tsx` and append **one line** to `screens/registry.tsx`.

### 2. Concept Preservation
- This application is a **2D Neon Gamer Hideout**, not a generic table/grid SaaS dashboard.
- Features attach to stable **Spot IDs** (`cabinet`, `phone`, `computer`, `photo`, `album`, `note`) defined in `lib/spots.ts`.

### 3. Code Conventions & Language
- **All UI copy, variable names, and documentation must be written in ENGLISH.**
- Use functional React components with named exports (PascalCase filenames).
- Use `"use client"` only where client-side interactivity is required (default to Server Components).
- No hardcoded hex colors or fonts—use Tailwind design tokens from `DESIGN.md`.
- No direct `fetch` calls in UI components—use API wrappers in `lib/api/`.

### 4. Security & Privacy
- Never commit private keys, API secrets, or `.env.local`.
- Use `.env.example` as a template for required environment variables.
- Do not rely on `localStorage` for primary persistence (use Supabase).
