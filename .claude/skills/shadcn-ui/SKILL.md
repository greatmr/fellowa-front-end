---
name: shadcn-ui
description: How this project consumes shadcn/ui and Tailwind v4 - finding and reusing the vendored primitives, adding a new one with the CLI or by hand in the registry's shape, the CSS-first design tokens and why no component may hardcode a color, dark mode via next-themes, the Persian font stack, and RTL with logical properties. Use before creating or styling any UI, when a design mentions colors, spacing or dark mode, when a primitive seems missing, or when the layout must work in Persian.
---

Facts about what is installed, the token list and the theme architecture are in `.claude/references/ui-and-theme.md`. This skill is the procedure.

## Reuse before you build

1. **Look in `src/components/ui/`.** Present today: `avatar badge button card dialog dropdown-menu form input label separator skeleton sonner tabs textarea`. Read the file before deciding it cannot do the job — the variants and the `data-slot` hooks are usually enough.
2. **Then look in the registry.** `npm run ui -- <name>` (= `shadcn add`) adds a primitive and its Radix dependency. It needs network access to `ui.shadcn.com`.
3. **If the CLI cannot reach the registry,** write the file by hand **in the registry's shape**, and install the Radix package yourself: a function component over `React.ComponentProps<"el">` (or `typeof Primitive.X`), a `data-slot` attribute, `cn(...)` with `className` last so callers can override, `cva` for variants, `"use client"` only if the primitive needs browser APIs. Keeping the shape is what lets a later `shadcn add` replace it cleanly. Do not invent a different API.
4. **Compose, don't fork.** Need a variant? Add it to the component's `cva` config. Need different composition? Build a feature component that uses the primitive. Do **not** rewrite a vendored file beyond what the task requires, copy a primitive into a feature directory, or hand-roll something the registry already has.
5. Check `src/components/providers/` before adding a provider. Each one widens the client boundary; one more root provider for a single widget is a cost paid by the whole tree.

## Tokens, not values

- Colors come from the semantic tokens only: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`, `bg-secondary`, `bg-accent`, `bg-destructive`, `border-border`, `ring-ring`, `bg-popover`, `chart-1..5`. Radii from `rounded-sm|md|lg|xl` (derived from `--radius`).
- **A hex, `rgb()` or `oklch()` anywhere outside `src/app/globals.css` is a bug.** The tokens there are shadcn's neutral defaults standing in for a Fellowa brand palette; a hardcoded color is a pixel that will not change when the brand lands.
- Tailwind v4 is CSS-first: there is no `tailwind.config.*`. A new token is a CSS variable in `:root`, its dark value in `.dark`, and a mapping in `@theme inline` — all three, or it will not work in one of the modes.
- Tailwind's default spacing and type scales are intact (unlike some design-system presets), so `p-4`, `gap-6`, `text-sm` behave as you expect. Arbitrary values (`max-w-[42ch]`) only where no token fits and for a reason you can state.
- `.numeric` (in `globals.css`) gives tabular numerals; use it for money columns and counts, never globally.
- Styling lives in utilities. `style={{}}` is for a value computed at runtime (a progress width, a CSS custom property), not for anything a class can express.

## Dark mode

`next-themes`, `attribute="class"`, `defaultTheme="light"`, `enableSystem`, in `app-providers.tsx`. **There is no toggle UI yet** — do not assume one exists and do not add one unless the task asks.

Write every surface so it survives the class flip: semantic tokens only, no fixed `text-black` / `bg-white`, no assumption about what colour the background is, and check contrast in both modes. A section that must stay dark regardless is a deliberate exception — say so where you write it.

## Persian typography and RTL

- The font stack in `globals.css` names Vazirmatn and falls back to other Persian faces then the system stack. It is **not** fetched from Google Fonts, on purpose. To ship the real face, add woff2 files under `public/fonts/` and load them with `next/font/local` in the locale layout, setting `--font-vazirmatn`. Do not switch to `next/font/google`.
- `fa` renders RTL; `<html dir>` is set by the locale layout. Correct RTL comes from **logical properties**: `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`, `border-s`/`border-e`, `rounded-s`/`rounded-e`. `ml-`, `pr-`, `left-`, `text-left` are bugs in `fa` unless the thing genuinely is physically left.
- Mirror directional glyphs (`rtl:rotate-180` on chevrons, arrows, back buttons). Progress fills, carousels, sliders, drag handles and anything with a direction must be **looked at** in `fa`, not reasoned about.
- Mixed-direction runs (a Latin handle in a Persian sentence, a URL, an amount with a unit) reorder unless isolated. Check them.
- Persian vs Latin digits: one behavior per surface, consistently. Mixing them in one view is a bug.

## Verify

`npm run typecheck`, `npm run lint`, and look at the component in each state it can be in — default, hover, focus-visible, disabled, loading, empty, error and **locked** — in both `fa` (RTL) and `en`, at mobile and desktop widths, in light and dark. If you could not view it, say so in the report; a screenshot in one direction and one theme is not verification.
