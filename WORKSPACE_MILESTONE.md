# Workspace Milestone — Listing Workspace + Persistent Property Editor

Turns `/projects/[projectId]` from a minimal read-only page into the primary
application workspace for an imported property. Built on the existing
repository/service/action architecture — no architecture was replaced.

## Functionality implemented

**Workspace shell** (`/projects/[projectId]`, route group `(workspace)`):

- Sticky top bar: project title, status badge, live save-state indicator, and
  "Updated <time>". Mobile: a hamburger opens an accessible sheet nav.
- Desktop: compact left sidebar (Overview, Photos, Rooms, Property Details,
  Settings) + back-to-dashboard + sign out.
- Nested routes per section — real URLs, predictable back/forward.
- Unsaved-change guard: `beforeunload` warning + an in-app navigation confirm
  when the editor is dirty.
- The `/processing` route sits outside the group and keeps its full-screen layout.

**Overview** — hero image, address, price, and all persisted facts (beds, baths,
sq ft, year built, lot size, HOA, annual tax) with intentional "Not provided"
states; MLS description; amenities; room-classification summary; processing
status; source URL; created/updated timestamps.

**Persistent property editor** (Property Details) — edits and persists title,
address (line 1 / city / region / postal), price, beds, baths, sq ft, lot size,
year built, HOA, annual tax, description, and amenities. Zod validation, typed
action state, server-side authorization, dirty-state detection, save-button
states, success feedback (toast + top-bar indicator), field-level errors,
unsaved-change protection, and reset/cancel.

**Photos** — responsive gallery, room-type filter chips (from `?room=`), a photo
detail dialog with source metadata + confidence, and an editable room
classification that **persists corrections optimistically** (reliable rollback).

**Rooms** — photos grouped by detected room type: label, count, confidence
summary, representative image, and a deep link into the filtered gallery. No
dimensions or spatial accuracy are claimed.

**Settings** — editable project title, source URL display, project metadata,
provider/persistence mode indicator, and project deletion behind an explicit
confirmation dialog that enforces ownership and redirects to the dashboard.

## Important files

```
src/app/projects/[projectId]/(workspace)/layout.tsx     shell layout: authorize + gate + chrome
src/app/projects/[projectId]/(workspace)/page.tsx       Overview
src/app/projects/[projectId]/(workspace)/details/page.tsx   editor host
src/app/projects/[projectId]/(workspace)/photos/page.tsx    gallery host (reads ?room)
src/app/projects/[projectId]/(workspace)/rooms/page.tsx     room summary host
src/app/projects/[projectId]/(workspace)/settings/page.tsx  settings
src/app/projects/[projectId]/(workspace)/loading.tsx        section skeleton

src/features/workspace/workspace-shell.tsx     top bar + responsive nav + guard
src/features/workspace/save-status.tsx         save-state context + top-bar indicator
src/features/workspace/nav-items.ts            section config + active detection
src/features/workspace/property-facts.tsx      read-only facts grid
src/features/workspace/project-title-form.tsx  settings title form
src/features/workspace/delete-project-dialog.tsx  confirm-to-delete
src/features/listing-editor/listing-editor.tsx    RHF editor
src/features/media/photo-gallery.tsx           gallery + filter + dialog + correction
src/features/media/room-summary.tsx            grouped room cards
src/features/media/image-url.ts                display-URL + representative-image helpers

src/server/actions/property-actions.ts         updatePropertyAction, correctRoomAction
src/server/actions/project-actions.ts          + updateProjectTitleAction, delete w/ redirect
src/server/services/project-service.ts         + saveListingDetails()
src/types/schemas.ts                           + listingEditSchema
```

## Persistence flow

Editor save: `ListingEditor` (client) validates with `listingEditSchema`, calls
the `updatePropertyAction` **server action** → `saveListingDetails` **service**
→ authorizes → `projects.update({title})` + `properties.upsert(...)` on the
**repository** → `revalidatePath` + `router.refresh()`. No client component ever
touches the database.

Room correction: `PhotoGallery` optimistically updates local state → calls
`correctRoomAction` → `correctRoomType` service → `images.updateRoomType(...,
{ confidence: 1, corrected: true })`. The `correctedByUser` flag makes
re-processing preserve manual corrections. On failure the UI rolls back.

The adapter split is preserved: the in-memory dev adapter and the Supabase
adapter both satisfy the same `Repositories` interface; the workspace only calls
services, which call repositories.

## Authorization model

Every read and mutation resolves ownership server-side via `authorizeProject`
(and RLS in production). The workspace `layout.tsx` authorizes once for the
subtree and each section page re-authorizes through `getWorkspace`. Owner
identifiers always come from the session (`requireUser`), never the browser.
Non-owners get `not_found` (existence is not leaked).

## Validation decisions

- **One schema, two checkpoints.** `listingEditSchema` runs client-side (instant
  field errors) and again server-side (authoritative). Numeric fields are strings
  in the form and coerced by `z.preprocess` (`""` → `null`, `"875,000"` → number).
- **RHF without `zodResolver`.** Validation runs via `safeParse` on submit to
  avoid `z.input`/`z.output` resolver-type friction with the preprocess schema.
- **`useWatch` over `watch()`** for React-Compiler compatibility.
- **Optimistic only where rollback is trivial** — room correction (single field)
  is optimistic; the multi-field editor save waits for confirmation.
- **Labels are associated** with controls (`useId`) for accessibility.

## Tests added

Unit/integration (Vitest, 30 total, all passing):
`zillow-url`, `schemas` (coercion, ranges, amenities, required title),
`authorization` (owner / non-owner / missing), `listing-edit` (valid edit,
unauthorized edit unchanged, room correction persisted + flagged, cross-project
image rejected). Component (RTL): `listing-editor` (pristine → dirty → reset,
submits coerced values, field errors block submit), `delete-project-dialog`
(explicit confirmation, correct target + redirect).

Playwright (2 specs, passing): the required happy path (dashboard → open →
edit → save → refresh persists) plus a sections smoke (photos filter + detail
dialog + room correction, rooms summary, settings + delete confirmation, mobile
sheet nav + no horizontal overflow).

## Known limitations

- Sections re-load the workspace aggregate per navigation (layout + page). Fine
  at current scale; a shared cache/loader could dedupe later.
- Image display uses the source URL; resolving Supabase `storagePath` to a public
  URL is still a TODO (`image-url.ts`).
- In-memory dev persistence resets on server restart (unchanged from prior).
- **Build gap discovered:** the Turbopack production build did **not** flag an
  invalid `"use server"` export (a non-async `const`); it surfaced only at
  webpack-dev runtime and in e2e. Keep the e2e smoke in CI as a backstop.

## Recommended next milestone

**Mortgage + Map sections.** The mortgage math (`src/lib/mortgage/calculator.ts`)
is written and can be mounted as a Mortgage section with sliders + amortization.
The Map section needs `mapbox-gl` re-added and a `PropertyMap` client component
with missing-token / no-coordinate / marker states. Then the AI assistant
(streaming Route Handler + panel; service is ready) and routing the existing 3D
viewer. Add unit tests for the mortgage calculator alongside.
