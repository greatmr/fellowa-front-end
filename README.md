# fellowa-web

Product frontend for Fellowa — the creator-subscription platform whose API lives
in `../back-end`. This is the **project base only**: packages, conventions,
app shell, i18n, API layer and the agent configuration under `.claude/`.

No product features are implemented yet. The Fellowa design tokens and branded
primitives are in place, ported from `../presentation` — the design team's
Vite prototype and this project's **design source**. Its screens are ported in
one task at a time (`../.claude/tasks/frontend/`), never copied or imported.

## Foundation migration (2026-10-22)

The shared foundation now includes Radix-backed switch, checkbox, and select
controls; locale-aware portal direction; keyboard-accessible theme selection;
and Sonner tones derived from the same light/dark Tailwind tokens. The existing
palette and named typography remain authoritative in `tailwind.config.ts`.

`components/layout/app-layout.tsx` supplies the studio frame,
`default-layout.tsx` supplies the new `(public)` header/footer and home frame,
and `error-layout.tsx` supports localized route and global error recovery.
The public introduction has working `#why` and `#features` sections; the full
marketing landing and backend-dependent product screens remain later tasks.

Progress and remaining gates are recorded outside the read-only agent
configuration in [the workspace tasks](../TASKS.md) and
[migration report](../MIGRATION_PROGRESS.md). Interactive tests use guarded
browser-API polyfills in `test/setup.ts`; no mock backend was added.

Use a runtime supported by the installed test dependencies (Node 20.19+, Node
22.13+, or Node 24+). This stage was verified using Node 22.23.4; the machine's
default Node 22.12 is too old for some dependencies. For production smoke checks
on this Next.js version, run `npm run start -- --hostname localhost` so the bind
host matches the internal locale rewrite origin.

## Stack

| Concern         | Choice                                                                      |
| --------------- | --------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack, Cache Components)                        |
| UI runtime      | React 19                                                                    |
| Language        | TypeScript 5, `strict`                                                      |
| Styling         | Tailwind CSS v4: tokens in `tailwind.config.ts`, semantics in `globals.css` |
| Components      | shadcn/ui (new-york, neutral base) + Radix primitives + lucide icons        |
| Server state    | TanStack Query v5                                                           |
| Client state    | Zustand                                                                     |
| HTTP            | Axios, one instance in `src/lib/api/client.ts`                              |
| Forms           | react-hook-form + zod (`@hookform/resolvers`)                               |
| i18n            | next-intl — `fa` (default, RTL) and `en`                                    |
| Toasts          | sonner                                                                      |
| Theme           | next-themes (`class` strategy)                                              |
| Tests           | Vitest + Testing Library + MSW                                              |
| Package manager | npm                                                                         |

## Commands

```bash
npm install
cp .env.example .env.local     # then fill in NEXT_PUBLIC_API_BASE_URL

npm run dev                    # http://localhost:3000
npm run typecheck              # tsc --noEmit
npm run lint                   # eslint
npm run test                   # vitest run
npm run build                  # next build
npm run ui -- button card      # add a shadcn/ui component (needs network)
```

## Layout

```
tailwind.config.ts     design tokens: palettes, type scale, radii, shadows, motion
src/
  app/[locale]/        routes; the locale layout owns <html lang dir>
  app/globals.css      Tailwind v4 entry: @config + semantic tokens per theme
  components/ui/       shadcn/ui primitives (registry shape + recorded brand deltas)
  components/common/   app composites (empty-state, error-state)
  components/providers/ app-wide client boundary (query, theme, toaster)
  features/<feature>/  feature-owned components, hooks, api, schemas, types
  i18n/                next-intl routing, request config, locale-aware navigation
  lib/api/             axios instance, error normalization, query client + keys
  lib/env.ts           zod-validated environment contract
  stores/              Zustand stores for client state shared across routes
  proxy.ts             next-intl locale routing (Next 16 proxy convention)
messages/{fa,en}.json  translations
test/                  vitest setup and MSW server
.claude/               agents, skills, rules and references for this project
```

## Conventions that are not negotiable

- **No invented contracts.** Type backend data from `../back-end/docs/modules/<module>/api.md`
  and the real controller/DTO. An unverified field is optional and reported.
- **Money** is integer Toman from the backend. Never compute, scale or round a
  chargeable amount on the client.
- **Gated content**: the backend decides the access level. The client renders
  what it was given and never reconstructs a locked body.
- **No raw colors or hardcoded user-facing text.** Tokens from `tailwind.config.ts` / `globals.css`,
  copy through next-intl keys in every locale.
- **Logical CSS properties** (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) so
  RTL works without a second stylesheet.

The full rules, the agent roster and the per-topic references are in
`.claude/` — start at `.claude/CLAUDE.md`.
