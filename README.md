# ListingAI

Turn a residential property listing into an interactive AI workspace: editable
listing data, room-grouped photos, a grounded property assistant, mortgage
modeling, a property map, and an estimated 3D spatial preview.

> **Status:** first production-grade vertical slice. The domain layer and the
> sign-in → dashboard → create → processing journey are complete and tested.
> See [`CURRENT_STATE.md`](./CURRENT_STATE.md) and [`HANDOFF.md`](./HANDOFF.md).

## Architecture overview

Feature-oriented App Router app. Domain logic lives outside React:

- **Server Actions** for form mutations, **Route Handlers** for polling/streaming.
- **Repository interfaces** with two adapters — in-memory (dev) and Supabase
  (prod) — selected by env. UI/services never import a concrete database.
- **Provider boundaries** are the only place external data enters:
  `ListingDataProvider` (no browser scraping), `RoomClassifier`, `AIProvider`,
  `StorageProvider`. Mock/deterministic implementations back local dev.
- **Zod** validates every untrusted boundary; services return typed `Result`
  objects instead of throwing for expected failures.
- **Authorization** is enforced server-side on every project read/mutation; RLS
  is the second layer in production.

```
src/app          routes (dashboard, projects, api)
src/features     feature UI + client hooks (auth, projects, processing, media, three-viewer, …)
src/components   shadcn-style UI primitives + shared chrome
src/lib          env, ai, providers, storage, validation, mortgage, database, utils
src/server       actions, repositories (memory + supabase), services, auth
src/types        domain types, Result, Zod schemas
supabase/migrations   SQL schema + RLS + storage bucket
tests            vitest unit + integration
```

Full file map and rationale: [`HANDOFF.md`](./HANDOFF.md).

## Local setup

Requires Node 20+ (developed on Node 26).

```bash
npm install
npm run dev     # http://localhost:3000
```

**No credentials are needed.** Without env vars the app uses an in-memory store,
dev cookie auth (email only), a grounded mock AI, and intentional "unavailable"
states for the map. Sign in with any email to get a workspace.

## Supabase setup (production persistence/auth/storage)

1. Create a Supabase project.
2. Apply the migrations (via the SQL editor or the Supabase CLI):
   ```bash
   supabase db push        # or run supabase/migrations/*.sql in order
   ```
   This creates the schema, enums, RLS policies, triggers, and the
   `property-images` storage bucket.
3. Set the Supabase env vars (below). When all three are present the app
   automatically switches from the in-memory adapter to Supabase — no code change.

## Environment variables

Copy `.env.example` to `.env.local`. All are optional; presence enables the real
provider.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server only — never exposed) |
| `OPENAI_API_KEY` | Enables OpenAI streaming assistant (else grounded mock) |
| `OPENAI_BASE_URL` / `OPENAI_MODEL` | Point at any OpenAI-compatible endpoint |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Enables the Mapbox map (else missing-token state) |
| `LISTING_PROVIDER` | `mock` \| `manual` |
| `ROOM_CLASSIFIER` | `heuristic` \| `ai` |
| `APP_SESSION_SECRET` | Signs the dev-auth cookie |

Server secrets live in `src/lib/env/server.ts` (`import "server-only"`);
browser-safe values in `src/lib/env/client.ts`.

## Test commands

```bash
npx vitest run          # unit + integration
npx vitest              # watch mode
npm run lint            # eslint
npm run build           # production build (typecheck + lint)
npx next typegen        # regenerate PageProps route types
# npx playwright install chromium && npx playwright test   # e2e (planned)
```

## Provider architecture

`ListingDataProvider` normalizes external listing data into the domain shape.
The `MockListingProvider` returns a deterministic fixture; a `ManualListingProvider`
creates an editable shell; a licensed MLS adapter can be added behind the same
interface. **Zillow is never scraped from the browser** — submitted URLs are
only validated and stored, then processed through the provider. The same pattern
governs room classification, AI, and storage.

## Known limitations

- Local dev persistence is **in-memory** (no Docker/Supabase in the sandbox);
  data resets on server restart. The Supabase adapter is written but unexercised
  locally.
- Background processing is fire-and-forget within the request process — good for
  `next dev`, but production needs a durable queue/worker.
- The 3D viewer is an **estimated spatial preview** derived from photo
  room-grouping — explicitly not a measured reconstruction of the home.
- No external datasets are fabricated (schools, crime, walk scores, taxes, room
  dimensions). The assistant states when such information is unavailable.
- Map/AI degrade gracefully without their credentials.

## Which features require external providers

| Feature | Works offline (mock) | Needs a provider |
|---------|----------------------|------------------|
| Auth, dashboard, projects | ✅ dev cookie + in-memory | Supabase for real persistence |
| Ingestion + processing | ✅ deterministic fixture | Licensed MLS/data feed for real listings |
| Room classification | ✅ heuristic | Multimodal model for photo-based AI |
| Property assistant | ✅ grounded mock | `OPENAI_API_KEY` for live model |
| Map | ⚠️ shows unavailable state | `NEXT_PUBLIC_MAPBOX_TOKEN` |
| 3D preview | ✅ procedural | — |

## Production deployment checklist

- [ ] Create Supabase project; run `supabase/migrations/*` in order.
- [ ] Set all env vars; confirm `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- [ ] Verify RLS: a user cannot read another user's project/property/images/chat.
- [ ] Replace `MockListingProvider` with a licensed data adapter.
- [ ] Move processing to a durable queue/worker (replace fire-and-forget).
- [ ] Set a strong `APP_SESSION_SECRET` (or rely solely on Supabase auth).
- [ ] Configure image `remotePatterns` for your real image host.
- [ ] Run `npm run build`, `npx vitest run`, and the Playwright happy-path.
