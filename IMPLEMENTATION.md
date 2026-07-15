# ListingAI — Implementation Plan

First production-grade vertical slice: turn a residential listing URL into an
interactive AI listing workspace.

## Runtime & framework notes (Next.js 16)

This repo runs **Next.js 16.2 / React 19.2 / Tailwind v4**. Relevant breaking
changes verified against `node_modules/next/dist/docs`:

- `params` / `searchParams` are **Promises** in pages/layouts; `cookies()` and
  `headers()` are **async**.
- Middleware is renamed to **`proxy.ts`** (same functionality).
- `PageProps<'/route'>` is a **global** helper (no import).
- Server Actions via `'use server'`; Route Handlers via `route.ts`.
- Tailwind v4 is CSS-first (`@import "tailwindcss"` + `@theme`), no JS config.

## Key architecture decision: swappable persistence & auth

The target production stack is **Supabase** (Auth + Postgres + Storage), with
real SQL migrations and Row Level Security in `supabase/migrations`.

This sandbox has **no Docker**, so a local Supabase stack cannot run. To keep the
vertical slice runnable end-to-end we ship two adapters behind repository/auth
interfaces, selected automatically by env presence:

- **In-memory adapter (default dev):** a `globalThis`-pinned store + cookie-based
  dev auth. Survives HMR; single-process only. This is a *persistence adapter*
  swap, not fabricated data — listing data still flows through the real
  provider → processing → repository pipeline.
- **Supabase adapter (production):** used when `NEXT_PUBLIC_SUPABASE_URL` +
  keys are present. Same repository interfaces, real RLS.

This isolation is the same principle the spec demands for the listing-data
provider: swap the boundary without touching UI or domain logic.

## Provider boundaries (mock only at the edges)

- `ListingDataProvider` — `MockListingProvider` (deterministic fixture),
  `ManualListingProvider`, future MLS adapter. **No Zillow browser scraping.**
- `RoomClassifier` — deterministic `HeuristicRoomClassifier` (filenames/order/
  fixture metadata) + `AIRoomClassifier` adapter boundary.
- `AIProvider` — `MockAIProvider` (grounded, deterministic, no key needed) +
  `OpenAIProvider` (OpenAI-compatible). Streaming via route handler.
- `StorageProvider` — dev passthrough (keeps source URLs) + Supabase Storage.

## Directory layout

```
src/
  app/                      routes (dashboard, projects, api)
  components/ui/            shadcn-style primitives (Radix + Tailwind)
  features/<domain>/        feature UI + client hooks
  lib/{ai,database,env,providers,storage,queue,utils}
  server/{actions,repositories,services,auth}
  types/                    shared domain types + Zod schemas
supabase/migrations/        SQL + RLS
tests/ + e2e/               vitest + playwright
```

## Domain flow

1. Sign in → session cookie.
2. `/dashboard` lists the user's projects (authz per row).
3. `/projects/new` validates Zillow URL (https, host allowlist, homedetails path).
4. Server action creates `project` + `processing_job`, redirects to
   `/projects/[id]/processing`.
5. `ProcessingService` runs steps: validate → fetch (provider) → import photos →
   classify rooms → build context → prepare → complete. Job progress persisted;
   image ingestion idempotent (dedupe by `(project_id, source_url)`).
6. Polling `useJobStatus` hook (route handler) drives the status UI.
7. `/projects/[id]` workspace: Overview, Photos, Rooms, 3D, Map, Mortgage,
   AI Agent, Settings.

## Testing

Vitest units: Zillow validation, mortgage math, job transition rules, provider
normalization, idempotent ingestion, project authorization, room correction,
project creation, processing UI, editor save. One Playwright happy path.

## Known limitations

- In-memory dev store (no Docker/Supabase locally); resets on server restart.
- 3D viewer is an **estimated spatial preview** from room classifications — not a
  reconstruction of the actual home.
- Map/AI degrade gracefully without Mapbox/OpenAI credentials.
- No fabricated external datasets (schools, crime, walk scores, taxes).
