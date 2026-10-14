---
name: clean-code
description: Clean-code conventions for this Next.js + React + TypeScript project - smallest coherent change, single source of truth, the server/client split, responsibility placement, type-safety patterns, React idioms - plus the self-review checklist to run before declaring work done. Use when writing or reviewing non-trivial code, when asked to tidy or simplify, and always before reporting an implementation as finished.
---

Project rules live in `.claude/CLAUDE.md` and `.claude/rules/frontend-code.md`; this skill is the judgment layer and the final checklist. Match the surrounding code first — and where there is no surrounding code yet, you are writing the precedent, so pick the plainest shape and say in the report that you set it.

## Shape of the change

- One intention per change. If it does two things, say so and split the work.
- Fix at the owner of the data or behavior, not where the symptom shows. Trace first (`rg`, then `npm run typecheck` to find consumers), then edit.
- Refactor only the path you are already changing. Structural change and behavior change are separate steps; never hide one inside the other.
- No speculative structure: no interface with one implementation, no prop nobody asked for, no `features/` directory for a story that does not exist. Extract a shared helper only when two or more consumers need *identical* behavior; similar is not identical.
- Delete what your change made dead (the old branch, an unused prop, a message key nobody else uses, an orphaned helper). Dead code you merely noticed is reported, not removed.

## Responsibility and state

- **Server by default.** A component is a server component unless it needs state, effects, handlers or browser APIs. `"use client"` goes on the leaf that needs it; pushing it up to make a child work turns a subtree into client code and ships it to every visitor.
- Route files read params, fetch and render. Business logic lives in the feature, not in `page.tsx`.
- Presentational components take props and raise events; fetching, mapping and business rules live in the feature's `api/`, `hooks/` or server component. Presentation must be renderable without a network.
- **Server data belongs to the query cache**, keyed so it invalidates. Never copy it into `useState` or a Zustand store — that is a second source of truth that will disagree. Client state shared across routes goes in a store; everything else is local `useState`.
- One owner per datum. Derive at the point of use instead of storing a derived value. `useEffect` synchronizes with something outside React — it is not for deriving state, not for fetching, not for keeping two copies in sync.
- Keep URL state, store state and form state from competing for the same value. Pick the owner and read from it.
- No duplicated API calls: the same key is deduplicated by the cache; two keys for the same data is a bug.

## TypeScript

- `unknown` + narrowing instead of `any` (lint enforces it). No unexplained `as` / `!` / `@ts-ignore`.
- **Type at the edges, from the real contract.** API types come from the backend's controller, DTO and entity — never from a story, a design package or a guess. A field you could not verify is optional and reported. Type only what the UI uses.
- Where a value is parsed rather than trusted, write the zod schema and let the type be `z.infer` of it so the two cannot drift.
- Model states as discriminated unions (an access level, a payment status, a request result), narrow with guards, make a `switch` exhaustive with a `never` check, use `satisfies` for config literals, `import type` for types.
- Treat API data as possibly missing: `?.` and `??` deliberately, never `||` where `0`, `""` or `false` are valid values (a count of zero and a free tier are both real).

## React idioms used here

- Function components; props as an inline or exported type, no `React.FC`; defaults in the destructure.
- New primitives follow the shadcn shape: `React.ComponentProps<"el">`, a `data-slot`, `cn()` last, `cva` for variants.
- Keys on lists are stable ids from the data, never the index.
- Clean up timers, listeners, observers and in-flight requests. Reset loading state in a `finally` so a throw cannot leave a spinner forever.
- Prefer early returns and a computed value over nested ternaries in markup; move a non-trivial expression out of JSX.
- Suspense and streaming boundaries are architecture, not decoration: add one because something genuinely loads separately, and give it a real fallback.

## Before you say "done"

- [ ] The diff does one thing; each acceptance criterion maps to something in it.
- [ ] No `any`, unexplained `as` / `!` / `@ts-ignore`; API shapes typed from the real contract; nothing invented.
- [ ] `"use client"` is on the narrowest component that needs it; no server-only module imported into client code; no secret reachable from the browser.
- [ ] **No gated content, token or secret in the payload, the cache, the props or the HTML** for a viewer who should not have it; nothing hidden with CSS instead of withheld.
- [ ] No hardcoded colors, ad-hoc pixels, or user-facing strings; new keys exist in **both** `fa` and `en`.
- [ ] Logical CSS properties used; the change looked at in `fa` RTL and in dark mode, or listed as not verified.
- [ ] Loading, empty, error and locked states exist for anything that fetches; null and empty inputs handled at boundaries.
- [ ] No duplicated state or calls; no server data in a store; query keys contain every input, `context` included; mutations invalidate what they change.
- [ ] No client-side arithmetic on a chargeable amount; every amount rendered with its unit; the price snapshot used where it applies.
- [ ] Dead code from your change removed; unrelated problems noted, not fixed; no new dependency without saying why.
- [ ] `npm run typecheck`, `npm run lint` and `npm run test` clean, compared against the baseline in `.claude/CLAUDE.md`; `npm run build` run if routing, config or caching changed.
- [ ] The report states what was not verified.
