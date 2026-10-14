# UI, tokens, theme and RTL (facts as of 2026-10-11; verify against code)

Procedure: skill `shadcn-ui`. Code conventions: `.claude/rules/frontend-code.md`.

## shadcn/ui in this project

- **Not a dependency.** shadcn components are source files vendored into `src/components/ui/`, owned by this repo. `components.json` records the configuration the CLI uses: style `new-york`, `rsc: true`, `tsx: true`, base color `neutral`, CSS variables, lucide icons, aliases `@/components`, `@/components/ui`, `@/lib/utils`, `@/lib`, `@/hooks`.
- **Present today:** `avatar badge button card dialog dropdown-menu form input label separator skeleton sonner tabs textarea`. Anything else has to be added.
- **Add with `npm run ui -- <name>`** (= `shadcn add`). It needs network access to `ui.shadcn.com`. If that is blocked, write the file by hand **in the registry's shape** — a function component over `React.ComponentProps<"el">`, a `data-slot` attribute, `cn()` applied so `className` wins, `cva` for variants, `"use client"` only when the primitive needs it — so a later `shadcn add` can still replace it cleanly. Also install the Radix package it wraps.
- **Do not rewrite a vendored file** to get a variant: add a `cva` variant or compose around it. Do not fork a primitive into a feature directory, and do not hand-roll something that exists in the registry.
- Radix packages installed: `react-slot`, `react-label`, `react-separator`, `react-avatar`, `react-dialog`, `react-dropdown-menu`, `react-tabs`. Plus `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `next-themes`, `tw-animate-css`.

## Tokens: the only place color exists

Tailwind v4, **CSS-first** — there is no `tailwind.config.*`. Everything lives in `src/app/globals.css`:

- `@import "tailwindcss"` then `@import "tw-animate-css"`, and `@custom-variant dark (&:is(.dark *))`.
- `:root` defines the semantic tokens as `oklch()` values; `.dark` redefines them. `@theme inline` maps each to a Tailwind color so `bg-background`, `text-muted-foreground`, `border-border` work.
- Tokens: `background`, `foreground`, `card(-foreground)`, `popover(-foreground)`, `primary(-foreground)`, `secondary(-foreground)`, `muted(-foreground)`, `accent(-foreground)`, `destructive(-foreground)`, `border`, `input`, `ring`, `chart-1..5`, plus `--radius` and the derived `radius-sm|md|lg|xl`.
- **These are shadcn's neutral defaults, standing in for a Fellowa brand palette.** When the brand palette is decided, change the values in `globals.css` and nowhere else. A component that hardcodes a hex, `rgb()` or `oklch()` breaks that swap — which is why it is a hard rule, not a preference.
- `@layer base` sets the border/ring defaults and gives `body` the background, foreground and sans font. `.numeric` opts a column of figures into tabular numerals; use it for money and counts, not globally.

## Dark mode

`next-themes` with `attribute="class"`, `defaultTheme="light"`, `enableSystem`, mounted in `src/components/providers/app-providers.tsx`; `<html>` carries `suppressHydrationWarning` for it. There is **no theme toggle UI yet** — building one is a task, not an assumption. Write every new surface so it survives the class flip: semantic tokens only, no fixed `text-black` / `bg-white`, no assumption about what the background is. A permanently dark section is its own case and must be stated as such.

## Fonts

**Deliberately not `next/font/google`.** A build-time fetch of Google Fonts makes the build depend on the network and is unreliable from Iran. `--font-sans` in `globals.css` names `var(--font-vazirmatn)`, then `Vazirmatn`, `IRANSansX`, `IRANSans`, `Tahoma`, then the system stack — so a locally installed Persian face is used and the layout degrades sanely without one.

To ship Vazirmatn properly: put the woff2 files in `public/fonts/`, load them with `next/font/local` in the locale layout, and set `--font-vazirmatn` to the returned variable. Do not switch to `next/font/google`.

## RTL

- `fa` is the default locale and renders **RTL**; the locale layout sets `dir` on `<html>` from `getDirection(locale)` in `src/i18n/routing.ts`. `rtlLocales` is the list.
- There is **no RTL stylesheet and no `dir`-specific CSS file**, by design. Correct RTL comes from **logical properties**: `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`, `border-s`/`border-e`, `rounded-s`/`rounded-e`. The physical forms (`ml-`, `pr-`, `left-`, `text-left`) are bugs in `fa` unless the thing genuinely is physically left.
- Directional glyphs need mirroring: `rtl:rotate-180` on chevrons, arrows and back buttons (the vendored `dropdown-menu` sub-trigger already does this). Progress fills, carousels, sliders, drag handles and anything with a direction must be looked at in `fa`, not reasoned about.
- Mixed-direction text (a Latin handle inside a Persian sentence, a URL, a number with a unit) needs an isolating wrapper or it will reorder. Check it rather than assuming.
- Verify in both directions. A screenshot in `en` tells you nothing about `fa`.

## Animation

`tw-animate-css` provides the `animate-in` / `animate-out` / `fade-*` / `zoom-*` utilities the vendored primitives use. Prefer a Radix state-driven animation (`data-[state=open]:…`) over a hand-written transition, and respect reduced-motion for anything decorative.
