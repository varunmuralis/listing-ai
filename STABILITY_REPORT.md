# ListingAI — Stability Report

Engineering audit + stabilization pass. **No new features were added** — the one
new page is a read-only view of already-ingested data added solely to fix a
404 on the primary success path (see "Bugs fixed" #1).

## Audit gate results (after stabilization)

| Gate | Before | After |
|------|--------|-------|
| `npm install` | ok | ok |
| `npm run lint` | ✅ clean | ✅ clean |
| `npx tsc --noEmit` | ✅ clean | ✅ clean |
| `npm test` (added script) | ❌ no script | ✅ 2/2 pass |
| `npm run build` | ✅ 7 routes | ✅ 8 routes |
| Route smoke test | not run | ✅ all correct |

Runtime smoke (dev server): `/sign-in` → 200; `/dashboard`, `/projects/new`,
`/projects/[id]` → 307 to `/sign-in` (proxy auth gate); unknown route → custom
404. No runtime errors in the server log.

## Bugs fixed

1. **Dead navigation → 404 on the success path (critical).** `project-card`,
   `processing-view` (auto-redirect + "Enter workspace"), and the processing page
   all navigate to `/projects/[projectId]`, but that route had **no page** — every
   completed import landed on a 404. Fixed by adding a minimal **read-only
   overview** page (`src/app/projects/[projectId]/page.tsx`) that renders
   already-persisted property data (address, price, bed/bath/sqft/year, photo
   count, description, amenities, detected room groups) and redirects back to
   `/processing` if the project isn't `ready`. It adds **no new capability** —
   no editing, AI, map, mortgage, or 3D — and marks those sections "in
   development" with a TODO.
2. **Server actions could throw unhandled (500s).** `createProjectAction`,
   `deleteProjectAction`, `signInAction` (dev branch), and `signOutAction` now
   wrap their fallible work in try/catch and return a typed `errorState` (or log
   and continue for fire-and-forget paths). `redirect()` is kept **outside** the
   try/catch so its control-flow signal isn't swallowed.
3. **Missing loading/error/404 UX.** Added Next conventions: `app/error.tsx`
   (route error boundary), `app/global-error.tsx` (root boundary),
   `app/not-found.tsx` (custom 404), and `app/loading.tsx` (navigation fallback).

## Cleanup performed

**Removed unused dependencies** (zero imports in `src/`):
`react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query-devtools`,
`mapbox-gl`, `@types/mapbox-gl`, `@radix-ui/react-tabs`,
`@radix-ui/react-dropdown-menu`, `@radix-ui/react-avatar`.
_Re-add per milestone:_ `react-hook-form` + `@hookform/resolvers` (listing
editor), `mapbox-gl` + `@types/mapbox-gl` (map). The three Radix packages had no
corresponding primitive and aren't needed by the current plan.

**Removed dead / speculative code:**
- `generateReply` (assistant-service) — a non-streaming path with a misleading
  "for tests" comment and no test or caller.
- `formatCurrencyPrecise` (utils) — no references.
- `isStepComplete`, `nextStep` (job-transitions) — no references; the processing
  UI computes its own richer step state inline.
- Cleaned up the now-unused imports these left behind.

**Added TODO markers where functionality is intentionally incomplete:**
- `assistant-service.ts` — streaming service is complete but not yet consumed;
  the AI Route Handler + chat panel are pending.
- `room-visuals.tsx` `confidenceLabel` — awaits the Rooms section UI.
- `three-viewer/property-three-viewer.tsx` — component ready but not yet routed.
- `providers/rooms/ai-classifier.ts` — already carried a TODO for the multimodal
  model; left in place.
- The new overview page carries a TODO pointing at the full workspace milestone.

**Tooling:** added `test` (`vitest run`), `test:watch`, and `typecheck`
(`tsc --noEmit`) scripts so `npm test` works.

## Checklist status

| Item | Status |
|------|--------|
| Fix every TypeScript error | ✅ none present (verified) |
| Fix every lint error | ✅ none present (verified) |
| Remove dead code | ✅ 4 symbols removed |
| Remove unused dependencies | ✅ 8 packages removed |
| Remove duplicated components | ✅ none found (`dialog`/`sheet` share Radix Dialog by design, not duplication) |
| Improve folder organization | ✅ structure is already feature-oriented and coherent; no moves needed |
| Every page loads | ✅ all routes 200/redirect/404 correctly; success-path 404 fixed |
| Server actions have error handling | ✅ all 4 actions hardened |
| Every form has validation | ✅ sign-in + new-project validate via Zod (client + server) |
| Loading/error states everywhere | ✅ global loading/error/404 added; processing view already had per-state UI |
| TODOs for incomplete functionality | ✅ added |

## Remaining technical debt

- **In-memory dev persistence.** Default adapter resets on server restart and is
  single-process. The Supabase adapter is written but **unexercised** against a
  live DB — validate before trusting it in production.
- **Fire-and-forget background processing.** `ensureProcessing` runs the pipeline
  in the request process (fine in `next dev`; a serverless host may kill it after
  the response). Needs a durable queue/worker.
- **Thin automated test coverage.** Only the ingestion pipeline is covered
  (integration). Unit tests for URL validation, mortgage math, job transitions,
  authorization, and provider normalization — plus a Playwright happy-path — are
  still to be written (the code is structured for them).
- **Unwired-but-ready code.** The assistant service, the 3D viewer component,
  `confidenceLabel`, and `STARTER_QUESTIONS` are complete but have no UI consumer
  yet. They are intentionally retained (documented + TODO'd), not dead.
- **Fixture images** depend on `picsum.photos` at render time (allowlisted in
  `next.config.ts`).

## New technical debt (workspace milestone)

- **Build gap: `"use server"` export validation.** The Turbopack production build
  did **not** flag a non-async export from a `"use server"` file (`idleSaveState`,
  since removed). It only surfaced at webpack-dev runtime and via the Playwright
  e2e. Keep the e2e smoke as a CI backstop; don't rely on `next build` alone to
  catch server-action module violations.
- **Per-navigation workspace reload.** The `(workspace)` layout authorizes and
  each section page re-loads the workspace aggregate via `getWorkspace`. Correct
  and cheap now; a shared request-scoped loader/cache would dedupe later.
- **Image display URL.** `image-url.ts` renders `sourceUrl`; resolving Supabase
  `storagePath` to a public URL is still a TODO for the Supabase path.

## Architectural concerns

- **Adapter parity risk.** Two persistence backends (memory + Supabase) implement
  the same interfaces, but only memory is exercised locally. Divergence (e.g.
  the room-correction `metadata.correctedByUser` flag, upsert-on-conflict
  semantics) will only surface against real Supabase. Add a contract test suite
  that runs both adapters through the same assertions once a DB is available.
- **Background work durability** (as above) is the main production gap.
- **Auth duality.** Dev cookie auth vs Supabase auth are cleanly abstracted, but
  the dev cookie path (`APP_SESSION_SECRET`) must never ship as the active mode
  in production — gate it behind an explicit environment assertion.

## Recommended next milestone

**Complete the workspace shell + listing editor** (HANDOFF.md priorities #1–#2):

1. Replace the temporary overview with the real workspace shell: left nav
   (desktop) / sheet nav (mobile) + section sub-routes.
2. Build the **listing editor** on the overview — re-add `react-hook-form` +
   `@hookform/resolvers`, wire `propertyEditSchema` + a `updateProperty` server
   action, with dirty-state, save status, validation errors, and an
   unsaved-changes guard.
3. Add the **Rooms** section (grouped galleries + `confidenceLabel` +
   `correctRoomType` action) and **Photos** gallery.

Then proceed to Mortgage (calc lib ready), Map (re-add `mapbox-gl`), the AI chat
Route Handler + panel (service ready), and route the 3D viewer. Backfill the
unit + Playwright tests alongside each.
