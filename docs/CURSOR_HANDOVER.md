# CURSOR_HANDOVER.md
> Single source of truth for AI coding assistants working on **PINIT** (web).

## Project at a glance
- **Stack:** Next.js 15 (App Router) + React 19 — **web (HARD ASSERTION)**
- **Language:** TypeScript (JS allowed where present)
- **Styling/UI:** Tailwind + Radix/shadcn
- **State/Data:** Client state via React; Firebase SDK for Auth, Firestore (pins), Storage (photos)
- **Maps:** Web map (Google Maps JS or MapLibre/Mapbox) with clustering
- **Deploy:** Vercel (primary). Netlify plugin exists but Vercel is source of truth.
- **Pkg mgr:** pnpm (npm works)

## Repo layout (typical)
- `app/` → routes & layouts (`layout.tsx`, `page.tsx`)
- `components/` → UI + map widgets
- `hooks/` → custom hooks
- `lib/` → utils (firebase client, google places client, geojson, etc.)
- `public/` → static assets
- `styles/` → Tailwind & globals
- Root: `package.json`, `next.config.*`, `tsconfig.json`, `.env.local` (ignored)

## Pin schema (web)
```ts
export type Pin = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  category?: string;   // e.g. "diner", "shop"
  photoUrl?: string;
  recCount?: number;   // popularity / recommendations count
  createdAt: number;   // ms epoch
  userId: string;
};
HARD REQUIREMENTS (non-negotiable)

🚫 This repo is Next.js web only. If you think it’s React Native/Expo, STOP and output a 3-line report. Do not make changes.

🔑 Never commit or expose secrets. Always use env vars or server routes.

Preflight (required BEFORE any edits — read-only)

Output exactly these 6 lines:

Stack detected from package.json (Next.js vs RN/Expo)

Three repo clues (e.g., next.config.*, app/, absence of android//ios/)

Files you plan to touch

Risk areas (SSR/CSR, map lib, env vars)

Rollback plan (files/commands to revert)

Estimated diff size (XS <30, S 30–120, M/L)

If unclear → stop and wait for review.

Change policy

Scope: Only touch files named in the request (or obvious neighbors in lib/).

Diffs: Keep small & focused. Add a 1–2 sentence rationale at the top of the diff.

Logging: Temporary console.log OK for diagnosis; remove/gate before finishing unless told otherwise.

Configs: Don’t churn eslint/prettier/build/CI unless explicitly requested.

Tests: Prefer small tests for utils (e.g., geo/cluster math). Include manual test steps.

Maps & clustering

Google Maps JS: use @googlemaps/markerclusterer; memoize markers; rebuild clusterer only when pins change; cluster click → center + zoom in by ~2.

Mapbox/MapLibre GL: use clustered GeoJSON source (cluster: true, clusterRadius: ~60, clusterMaxZoom: ~16), separate cluster/unclustered layers, label with point_count; on cluster click, use getClusterExpansionZoom + flyTo.

Show a clear count badge (from point_count or markerclusterer size) akin to mobile’s “recCount bubble”.

Performance & UX

Debounce pin updates; avoid re-creating markers/clusterers every render.

Keep map interactive frames smooth; prefer memoized data transforms (useMemo).

Accessibility: labels for interactive elements; keyboard focus management.

Offline (web)

Queue pin actions locally (IndexedDB via idb); sync to Firestore when reconnected.

Avoid blocking map paint while syncing; show a small “Syncing…” toast when applicable.

AI & enrichment (web)

After pin drop, enrich with Google Places (photos/details) server-side where possible to keep keys secret.

Simple ranking: recent pins + user categories + proximity.

Rollback & hygiene

Work on a feature branch; open a PR; verify on Vercel Preview.

Keep a short rollback plan in PR description for S/M/L diffs.

Do not rename/move large folders in routine fixes.

Starter prompts

A — First message in a new Cursor chat (read-only):

Read package.json, repo root, and docs/CURSOR_HANDOVER.md. Produce the 6-line Preflight checklist only. Do not edit files.

B — Clustering (Google Maps):

Per docs/CURSOR_HANDOVER.md: Implement clustering in components/ResultsMap.tsx using @googlemaps/markerclusterer. Create lib/formatPins.ts to convert Pin[] → markers. Memoize markers; on cluster click center + zoom in by 2. Keep diff XS and add a 2-sentence rationale.

C — Clustering (MapLibre/Mapbox):

Per docs/CURSOR_HANDOVER.md: Add a clustered GeoJSON source for Pin[] with cluster: true, clusterRadius: 60. Add cluster & unclustered layers, show point_count, and expand/zoom on cluster click. Keep diff XS and add a 2-sentence rationale.

Forbidden without explicit approval

Adding RN/Expo/metro/android//ios/ artifacts

Large refactors or dependency swaps

Lint/Prettier/CI changes

Secrets in code

Contact

If unsure, stop and request review here.


---

👉 This version now **includes the HARD REQUIREMENTS section explicitly**, in bold with the stop signs and key icons to make it pop out.  

Would you like me to also prep the little one-liner `STACK.md` for your repo root (so even if someone ignores `docs/`, the stack lock is obvious)?
