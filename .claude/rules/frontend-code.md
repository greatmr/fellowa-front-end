---
paths:
  - "src/**/*.{ts,tsx}"
---

# How code is written in `src/` (the conventions of this project; match them)

Hard rules are in `.claude/CLAUDE.md`. These are the shapes this project uses. Where a sibling file already does it differently, the sibling wins and the discrepancy goes in your report.

**Structure**
- Feature code lives in its feature: `src/features/<feature>/{api,components,hooks,schemas,types,index.ts}`. A feature imports another feature only through its `index.ts`. Shared pieces live in `src/components`, `src/hooks`, `src/lib`. Dependencies point inward: `app` → `features` → shared.
- Routes in `src/app/[locale]/**` stay thin: read params, fetch, render a feature component. No business logic, no data mapping, no fetch helpers defined inline in a route file.
- Component files are kebab-case (`post-card.tsx`), components themselves PascalCase. Co-locate a component's own types in the same file; share a type only when a second file needs it.
- Imports use the `@/…` alias across directories and a relative path only inside the same directory. `import type` for types (lint autofixes this).

**React / Next**
- Server component by default. `"use client"` only for state, effects, event handlers or browser APIs, and on the leaf that needs it — never on a layout or a page to make a child work.
- `params` and `searchParams` are Promises: `const { locale } = await params`. Call `setRequestLocale(locale)` in a server component that renders localized text in a statically rendered route.
- Props: a plain inline type or an exported `Props` type; no `React.FC`. Default values in the destructure, not `defaultProps`.
- Follow the shadcn idiom for new primitives: a function component taking `React.ComponentProps<"el">`, a `data-slot` attribute, `cn()` merging `className` last so callers can override, and `cva` for variants.
- `useEffect` is for synchronizing with something outside React. Not for deriving state, not for fetching (use TanStack Query or a server component), not for keeping a second copy of data in sync. Clean up timers, listeners and subscriptions.
- Never mutate props or query data. Derive at the point of use.

**State, requests, forms**
- Server data: TanStack Query, through a request hook in `features/<feature>/api/`. Details and the required shapes: skill `api-integration`.
- Client state shared across routes: a Zustand store in `src/stores` (`useXStore`, a `State` type, an explicit reset). Everything else is `useState` in the owning component. Never put server data in a store.
- Forms: `useForm` from react-hook-form with `zodResolver` and the schema in `features/<feature>/schemas/`. Error messages come from next-intl keys, not from literals in the schema — pass the message key and translate at render, or build the schema inside a hook that has the translator.
- URL state (a tab, a filter, a page) belongs in `searchParams` when it should survive a reload or be shareable; use `useRouter`/`usePathname` from `@/i18n/navigation`, never from `next/navigation`.

**Styling**
- Tailwind utilities in the markup. Design tokens only — `bg-background`, `text-muted-foreground`, `border-border`, `rounded-lg` — never a hex, `rgb()` or `oklch()` outside `src/app/globals.css`.
- Logical properties so RTL works: `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`. `ml-`, `pr-`, `left-`, `text-left` are bugs in `fa` unless the thing really is physically left.
- Compose classes with `cn()`. No `style={{}}` except for a value that must be computed at runtime (a progress width, a CSS variable).
- `src/components/ui/**` is vendored from the shadcn registry: keep those files in the registry's shape so `npx shadcn add` can update them. Extend by composing or by adding a `cva` variant, not by rewriting the file.

**Lint and format (enforced; don't fight them)**
- Prettier: semicolons, double quotes, 2 spaces, 80 columns, trailing commas, Tailwind class sorting. Don't reformat lines you aren't changing.
- `no-console` is an error (`console.warn` / `console.error` allowed). `@typescript-eslint/no-explicit-any` is an error. Avoid new `eslint-disable`; if one is unavoidable, scope it to a single line and say why.
- Run `npm run lint` and `npm run typecheck` on your own change before reporting.
