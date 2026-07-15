# ListingAI — Current State

Snapshot of what exists in the repo after the workspace milestone.

## Summary

The **backend/domain layer is complete and verified**, and the **core journey
works end to end**: sign in → dashboard → create project (Zillow URL) → real
processing pipeline → **listing workspace** (overview, persistent property
editor, photos, rooms, settings). Verified by 30 unit/integration tests and 2
Playwright specs. Remaining feature modules: Mortgage, Map, AI assistant, 3D.

Persistence/auth use a **swappable adapter**: an in-memory dev adapter (default,
because this environment has no Docker/Supabase) and a Supabase adapter for
production. Both satisfy the same repository/auth interfaces.

## Completed & verified

- **Foundations**
  - Typed env with graceful degradation (`src/lib/env/{server,client}.ts`). No
    external credential is required to boot.
  - Domain types + taxonomy (`src/types/domain.ts`), typed `Result` objects
    (`src/types/result.ts`), Zod schemas (`src/types/schemas.ts`).
  - Zillow URL validation (`src/lib/validation/listing-url.ts`).
- **Persistence**
  - Repository interfaces (`src/server/repositories/types.ts`).
  - In-memory adapter (`src/server/repositories/memory/*`) — HMR-safe global store.
  - Supabase adapter (`src/server/repositories/supabase/index.ts`) — compiles,
    unused locally.
  - Factory `getRepositories()` selects the adapter by env.
  - Supabase SQL migrations with RLS + storage bucket (`supabase/migrations/`).
- **Providers (mock only at the boundary)**
  - `ListingDataProvider`: Mock (deterministic fixture) + Manual + factory.
  - `RoomClassifier`: deterministic heuristic + AI adapter boundary + factory.
  - `AIProvider`: grounded Mock (no key) + OpenAI streaming + factory.
  - `StorageProvider`: dev passthrough + Supabase Storage.
- **Services**
  - Pure job/project transition rules (`job-transitions.ts`).
  - `authorization.ts` (per-project ownership), `project-service.ts`,
    `property-service.ts`, `processing-service.ts` (real steps, persisted
    progress, cancel/retry, **idempotent** image ingestion),
    `assistant-context.ts` + `assistant-service.ts` (grounded, streaming).
- **Auth + UI spine**
  - Dev cookie auth + Supabase auth behind `getCurrentUser()`/`requireUser()`.
  - `proxy.ts` optimistic route protection (Next 16 middleware rename).
  - Design system (`globals.css`) + shadcn-style primitives (`components/ui/*`).
  - Sign-in page + form; dashboard; project card; new-project form + page.
  - Processing: job status route handler, `useJobStatus` polling hook,
    `ProcessingView` (animated states, retry/cancel, a11y live region),
    processing page.
- **Workspace shell + property editor** (see `WORKSPACE_MILESTONE.md`) — the
  full workspace at `/projects/[id]`: responsive shell (left nav / mobile sheet),
  Overview, persistent listing editor (dirty-state, save states, validation,
  unsaved guard), Photos gallery (filters, detail dialog, optimistic room
  correction), Rooms summary, and Settings (title edit, provider mode, delete
  with confirmation). All routes build and load.
- **Tests**
  - 30 Vitest unit/integration tests — **passing** (pipeline + idempotency,
    URL validation, schema coercion, authorization, listing edit, room
    correction, editor dirty-state, delete confirmation).
  - 2 Playwright specs — **passing** (happy path + sections/mobile smoke).

## Partially done / in progress

- **3D viewer** (`src/features/three-viewer/property-three-viewer.tsx`) — typechecks
  but is **not yet wired into any route**. Awaits its own milestone.

## Not started (see HANDOFF.md / WORKSPACE_MILESTONE.md for priorities)

- Mortgage calculator UI (the math lib `src/lib/mortgage/calculator.ts` is done).
- Mapbox map component (re-add `mapbox-gl`).
- AI assistant chat panel + streaming route handler (service is ready).
- Route the existing 3D viewer.

## Quality gates at handoff

Run `npm run build`, `npm run lint`, `npx vitest run`. See HANDOFF.md for the
recorded results and any critical fixes applied.
