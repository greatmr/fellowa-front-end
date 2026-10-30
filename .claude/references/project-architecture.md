# Project architecture (facts as of 2026-10-11; verify against code, update when it changes)

## Where this sits

The Fellowa workspace (`..`) holds:

| Path | What it is |
|---|---|
| `back-end/` | the NestJS 11 API — the only backend. Has its own `.claude/` for backend work. |
| `front-end/` | **this project**: the product frontend. |
| `presentation/` | the **design source**: a React 19 + Vite prototype (package `react-example`, "Fellowa creator panel", Git submodule with its own origin, mock data only, changing every few days). Its screens are ported into this project one `FE-…` task at a time (skill `presentation-port`). Never import from it, never edit it, never copy its patterns (Vite, view-state router, no i18n, `localStorage` sessions). |
| `agents/Frontend-Claude/` | the **Vue-era** agent configuration this one was ported from (a different product). Historical; do not follow it. |
| `.claude/` | workspace orchestration: `project-manager`, `scrum-master`, `task-manager` agents, the task board, the frontend tasks and presentation sync ledger (`tasks/frontend/`), the 56 design packages as Markdown (`stories/DP-nn-*.md`) and the schema report (`reference/database-schema.md`). |

Frontend tasks are `FE-*` in `../.claude/tasks/frontend/tasks.md` (authoritative; the board mirrors it), with the plan and route map in `migration-plan.md` beside it. Design-team tasks are the `DS-*` ids in `../back-end/docs/tasks/design/design-tasks.md`; an `FE-*` task cites the `DS-*` states it implements.

## Stack and commands

Next.js 16.4 (App Router, Turbopack, **Cache Components and Partial Prefetching enabled**), React 19.3, TypeScript 5 strict, Tailwind CSS v4 (brand primitives in `tailwind.config.ts`, loaded with `@config`; semantic tokens in `globals.css`), shadcn/ui (new-york, neutral, CSS variables) over Radix primitives, lucide icons, TanStack Query v5, Zustand 5, axios, react-hook-form 7 + zod 4, next-intl 4, next-themes, sonner, Vitest + Testing Library + MSW. npm; Node >= 20.19 (developed on 22).

`npm run dev` (port 3000) · `build` · `start` · `lint` / `lint:fix` · `format` / `format:check` · `typecheck` · `test` / `test:watch` · `ui -- <component>` (= `shadcn add`).

`dev` and `build` need `NEXT_PUBLIC_API_BASE_URL` — copy `.env.example` to `.env.local`. `SKIP_ENV_VALIDATION=true` exists for a build with no backend configured; never set it in a running environment. Never print or copy a value out of `.env.local`.

## Layout

```
tailwind.config.ts     brand primitives — the ONLY file with hex values
src/
  app/[locale]/        layout (owns <html lang dir>), page, error, loading, not-found
  app/globals.css      Tailwind entry: @config, semantic tokens per theme (via --theme()), utilities
  components/ui/       shadcn primitives (+ brand deltas): avatar badge button card dialog
                       dropdown-menu form input label separator sheet skeleton sonner tabs textarea
  components/common/   app composites: empty-state, error-state
  components/providers/ app-providers (theme + query + toaster), query-provider
  features/<feature>/  api · components · server · schemas · types (auth and tiers implemented)
  hooks/               shared hooks (none yet)
  i18n/                routing.ts (locales, direction) · request.ts · navigation.ts
  lib/api/             client.ts (axios instance + helpers, withBearer) · errors.ts
                       (ApiError, toApiError) · types.ts (envelope types) ·
                       envelope.ts (parseEnvelope) · action-result.ts
                       (ApiActionResult, runApiAction) · query-client.ts · query-keys.ts
  features/<f>/types/  plain types · schemas/ zod schemas + response parsers ·
                       lib/ pure helpers (e.g. tiers/lib/tier-draft.ts)
  lib/env.ts           zod-validated env contract
  lib/utils.ts         cn()
  stores/              Zustand stores (none yet)
  proxy.ts             next-intl locale routing — Next 16's replacement for middleware.ts
messages/{fa,en}.json  translations
test/                  setup.ts · render.tsx (intl wrapper) · msw/{server,handlers}.ts · smoke.test.tsx
```

## Bootstrap and rendering

`proxy.ts` resolves the locale and rewrites into `app/[locale]`. The locale layout awaits `params`, rejects an unknown locale with `notFound()`, calls `setRequestLocale`, renders `<html lang dir>` and wraps the tree in `NextIntlClientProvider` → `AppProviders` (next-themes `class` strategy → `QueryProvider` → children + `Toaster`).

`AppProviders` is the **single** app-wide client boundary. Anything below it that needs no interactivity should still be a server component; adding another root provider for one widget makes the whole subtree client code.

Cache Components changes the rules you may remember: `params`/`searchParams` are Promises, uncached dynamic reads need the right boundary, and `"use cache"` is opt-in. Read `node_modules/next/dist/docs/` before working on routing or caching — `AGENTS.md` at the project root says the same thing and is regenerated by `next dev`.

## API layer

One axios instance, `apiClient` in `src/lib/api/client.ts`: base URL from `env.NEXT_PUBLIC_API_BASE_URL`, 20 s timeout, a request interceptor that attaches `Authorization: Bearer <token>` from a **single registered provider** (`setAccessTokenProvider`), and a response interceptor that converts every failure into `ApiError` via `toApiError`. Feature code uses `apiGet`/`apiPost`/`apiPatch`/`apiPut`/`apiDelete`, never `axios` directly.

`ApiError` carries `status`, `code`, `messages[]`, `isNetworkError` and the `isUnauthorized`/`isForbidden`/`isNotFound` helpers. Its body parsing handles the backend's `{data, errors}` exception envelope.

Query defaults (`query-client.ts`): `staleTime` 30 s, `gcTime` 5 min, no refetch on focus, **no retry on 4xx**, mutations never retry. One client per request on the server, one shared in the browser. Query keys: `src/lib/api/query-keys.ts` holds the root; each feature adds its own factory as it is built.

**Current auth transport.** The implemented auth feature keeps the access token in an httpOnly cookie. Server-only request functions pass it explicitly to guarded backend endpoints; React Query `use…Mutation` and `useOwnProfileQuery` hooks call narrow server actions, so the browser never receives the token. The generic `apiClient` token-provider seam still exists for other features. This implementation does not settle the workspace's longer-term refresh-token decision.

## Backend reality you must design against

The API is a legacy NestJS app mid-migration. As of 2026-10-11:

- It runs on the **legacy pre-migration schema**; there are **no migrations** and `synchronize: true` outside production. The target schema in `../.claude/reference/database-schema.md` is the destination, not what is live.
- Legacy names are real and will appear in responses: `Tire` is the Tier entity, `BuyTire` a membership purchase, `ChatLine` a chat, `CreatorBill` a payout. Map them to product language at the API boundary; do not propagate `Tire` into UI code, and do not assume a rename has happened.
- Phase 0 security work is **incomplete**. Known gaps include no content access control implemented, an endpoint returning a full account entity (password hash included) to anonymous callers, and payment amount handling defects. Consequences for this project: do not build gated-content UI that trusts the current responses without checking the endpoint, and report any response that contains more than the view needs.
- Naming across the workspace is unresolved: the package is `dutupia-nest`, the repo is `Fellowa`, the documents say `Flova`, storage uses a `patreon/` prefix. This project is `fellowa-web`; use "Fellowa" in code and copy until a decision says otherwise.

## Known gaps in this project (not precedent, and not bugs to "fix" silently)

- Auth routes and React Query auth hooks exist. The tier manager uses `useTiersQuery`, `useTierRolesQuery`, and `use…TierMutation` hooks over guarded server actions. Server-only tier API helpers pass the httpOnly cookie token as an explicit Bearer header. The browser receives a narrow tier model and never the token. Other product feature screens remain placeholders; no shared store is used for auth or tier data.
- `src/lib/api/query-keys.ts` has only the root key; factories come with their features.
- `test/msw/handlers.ts` is empty by design — handlers arrive with the endpoints that need them.
- No git hooks, no commitlint, no CI, no Playwright/e2e layer.
- `front-end/` is a separate git repository; review its diff from that directory.
- Switch, checkbox and select primitives are missing (`FE-FND-05`, needs packages). `ui/dialog.tsx` has an English sr-only "Close" (`FE-FND-08`).
- Fonts are **not** loaded from Google Fonts (a build-time fetch, and unreliable from Iran). The brand face is Vazirmatn (`FQ-1`), self-hosted from `public/fonts/vazirmatn/` with `next/font/local` in the locale layout, which sets `--font-brand` for the stack in `tailwind.config.ts`.
- `npm audit`: 5 high-severity advisories, all dev-only and transitive through `eslint-config-next` → `fast-glob` → `micromatch` → `braces`, no fix in range. Do not `npm audit fix --force`.
- `npx shadcn add` needs network access to `ui.shadcn.com`. If that is blocked, hand-write the component in the registry's shape (`data-slot`, `cn()` last, `cva` for variants) so a later `shadcn add` can still update it.
