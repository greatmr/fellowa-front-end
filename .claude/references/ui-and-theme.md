# UI, tokens, theme and RTL (facts as of 2026-10-14; verify against code)

Procedure: skill `shadcn-ui`. Porting a presentation screen: skill `presentation-port` + `presentation-mapping.md`. Code conventions: `.claude/rules/frontend-code.md`.

## shadcn/ui in this project

- **Not a dependency.** shadcn components are source files vendored into `src/components/ui/`, owned by this repo. `components.json` records the configuration the CLI uses: style `new-york`, `rsc: true`, `tsx: true`, base color `neutral`, CSS variables, lucide icons, aliases `@/components`, `@/components/ui`, `@/lib/utils`, `@/lib`, `@/hooks`.
- **Present today:** `avatar badge button card dialog dropdown-menu form input label separator sheet skeleton sonner tabs textarea`. Composites that are not registry primitives live in `src/components/common/` (`empty-state`, `error-state`).
- **Add with `npm run ui -- <name>`** (= `shadcn add`). It needs network access to `ui.shadcn.com`. If that is blocked, write the file by hand **in the registry's shape** — a function component over `React.ComponentProps<"el">`, a `data-slot` attribute, `cn()` applied so `className` wins, `cva` for variants, `"use client"` only when the primitive needs it — so a later `shadcn add` can still replace it cleanly. Also install the Radix package it wraps (from macOS, not from a Linux shell sharing this `node_modules`).
- **Extending a vendored file:** add a `cva` variant or compose around it. Brand adjustments to class values are allowed **only** when recorded in "Brand deltas from the registry" below, so they can be re-applied after a `shadcn add --overwrite`. Do not fork a primitive into a feature directory, and do not hand-roll something that exists in the registry.
- Radix packages installed: `react-slot`, `react-label`, `react-separator`, `react-avatar`, `react-dialog` (also backs `sheet`), `react-dropdown-menu`, `react-tabs`. Plus `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `next-themes`, `tw-animate-css`. Switch, checkbox and select are **not** installed (task `FE-FND-05`).

## Tokens: three layers, one source

| Layer | File | Holds | Rule |
|---|---|---|---|
| 1 Primitives | `tailwind.config.ts` | palettes, type scale, font stack, `card` radius, shadows, gradients, keyframes/animations | **The only file that may contain a hex value.** Ported from `../presentation` (see ledger `../../.claude/tasks/frontend/presentation-sync.md`) |
| 2 Semantics | `src/app/globals.css` | `:root` / `.dark` semantic tokens, `@theme inline` mapping, `--radius`, utilities, base layer | every value is `--theme(--color-…)` from layer 1 — no literals |
| 3 Usage | components | semantic utilities first; palette utilities for brand accents | no hex, `rgb()`, `oklch()`, no arbitrary sizes where a token exists |

**`cn()` knows the custom scales.** `src/lib/utils.ts` extends tailwind-merge with the `fontSize`, `boxShadow`, `borderRadius` and `backgroundImage` keys exported from `tailwind.config.ts`. Without it, `cn("text-label text-foreground")` drops one of the two (a size name reads as a color). A new key added to one of those exports is picked up automatically; a new *kind* of custom scale needs a class group there too.

**Tailwind v4 mechanics (verified against the installed 4.3.3):** `globals.css` loads the config with `@config "../../tailwind.config.ts"`. Values from a JS config generate utilities (`bg-brand-600`, `text-label`, `rounded-card`, `bg-cover-mix`, `animate-shimmer`) but are **not emitted as CSS variables** — `var(--color-brand-600)` is undefined at runtime. In CSS, reference them with `--theme(--color-brand-600)` (resolved at build time; `--theme(--color-white / 8%)` for alpha). A new semantic token therefore needs three edits: `:root`, `.dark`, and its `--color-*` line in `@theme inline`.

### Semantic tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` / `foreground` | ink-25 / ink-900 | ink-950 / ink-50 | page |
| `card`, `popover` (+`-foreground`) | white / ink-900 | ink-800 / ink-50 | surfaces |
| `primary` (+`-foreground`) | brand-600 / white | brand-500 / white | main action |
| `secondary` (+`-foreground`) | ink-100 / ink-800 | white 8% / ink-50 | quiet action |
| `muted` / `muted-foreground` | ink-50 / ink-550 | ink-900 / ink-300 | subdued surface / secondary text |
| `accent` (+`-foreground`) | ink-100 / ink-900 | white 10% / ink-50 | hover, selected row |
| `destructive` (+`-foreground`) | red-600 / white | red-600 / white | delete, error |
| `success` (+`-foreground`) | money-600 / white | money-600 / white | paid, active, earnings action |
| `warning` (+`-foreground`) | amber-500 / ink-900 | amber-500 / ink-900 | attention |
| `inverse` (+`-foreground`) | ink-900 / white | white / ink-900 | the presentation's `dark` button |
| `link` | brand-600 | brand-400 | text links (`primary` is too dark as text on the dark page) |
| `border` / `input` / `ring` | ink-150 / ink-250 / brand-500 | white 8% / white 12% / brand-400 | lines, control borders, focus |
| `chart-1…5` | brand-600, violet-600, money-500, amber-500, red-500 | the -400 steps | data series |

### Contrast (WCAG 2.1, computed 2026-10-14)

| Pair | Ratio | | Pair | Ratio |
|---|---|---|---|---|
| foreground on background (L) | 18.2 | | foreground on background (D) | 18.5 |
| muted-foreground on card (L) | 5.98 | | muted-foreground on card (D) | 10.1 |
| primary-foreground on primary (L) | 7.07 | | primary-foreground on primary (D) | 5.47 |
| link on card (L) | 7.07 | | link on background (D) | 5.15 |
| destructive (both) | 4.59 | | success (both) | 4.69 |
| warning-foreground on warning | 11.1 | | badge tones, light (`-700` on `-50`) | 4.89–8.09 |
| badge tones, dark (`-200/300` on 15% tint over card) | 6.74–8.86 | | | |

Rejected for failing AA: white on money-500 (2.37), white on red-500 (3.16), white on brand-400 (3.9). Do not "fix" a token back to them. `ink-400` (3.05 on white) is decorative/placeholder only — not body text.

### Palettes (`tailwind.config.ts`)

`brand` (Trust Blue 50–900) · `violet` (Creative Violet 50–900) · `money` (50,100,300–700) · `amber` (50,100,300–700) · `red` (50,100,300–700) · `ink` (25, 50, 100, 150, 200, 250, 300, 400, 500, 550, 600, 650, 700, 800, 900, 950) · `mist`. `ink-25/150/250/550/650` name values the presentation hardcoded; `ink-950` is a front-end value pending `FQ-6`. Tailwind's default palettes still exist but are **off-brand** — do not use `emerald`, `blue`, `rose`, `sky`, `pink`, `slate`, `gray` (`FQ-8`).

### Type scale

Named roles; Tailwind's default `text-xs…9xl` remain but new code uses the roles.

| Utility | Size / line | Replaces in the presentation |
|---|---|---|
| `text-micro` | 10 / 14 | `text-[10px]`, `text-[10.5px]` |
| `text-caption` | 11 / 16 | `text-[11px]`, `text-[11.5px]` |
| `text-label` | 12 / 18 | `text-[12px]`, `text-[12.5px]`, `text-xs` |
| `text-body-sm` | 13 / 20 | `text-[13px]`, `text-[13.5px]` |
| `text-body` | 14 / 22 | `text-[14px]`, `text-sm` |
| `text-body-lg` | 15 / 24 | `text-[15px]` |
| `text-subtitle` | 16 / 24 | `text-[16px]`, `text-[17px]`, `text-base` |
| `text-title-sm` | 18 / 26 | `text-[18px]`–`text-[20px]`, `text-lg`, `text-xl` |
| `text-title` | 22 / 30 | `text-[22px]`, `text-2xl` |
| `text-headline` | 26 / 34 | `text-[26px]` |
| `text-display` | 32 / 40 | `text-3xl` and up |

Weights as in the presentation: `font-medium` 500, `font-semibold` 600, `font-bold` 700, `font-extrabold` 800.

### Radius, shadow, gradient, motion

- `--radius: 0.625rem` → `rounded-sm` 6 · `rounded-md` **8** · `rounded-lg` 10 · `rounded-xl` 14 · `rounded-card` 20. The presentation's dominant `rounded-[8px]` (controls and cards) is `rounded-md`.
- Shadows: Tailwind defaults (`shadow-xs` is the presentation's workhorse) plus `shadow-soft`, `shadow-panel` (sheets, popovers, floating panels), `shadow-brand` (glow under a primary CTA).
- Gradients: `bg-cover-brand`, `bg-cover-violet`, `bg-cover-mix` (also the logo mark).
- Animations: `animate-shimmer`, `animate-toast-in`, `animate-pop-in`, `animate-check-draw` (with `check-path`), `animate-shake` (form error). Radix state animations from `tw-animate-css` (`data-[state=open]:animate-in` …) stay preferred for overlays. A global `prefers-reduced-motion` rule shortens every animation and transition.

### Utilities (`globals.css`)

`teaser-fade` (fade-out mask on a gated teaser) · `no-scrollbar` · `scrollbar-thin` (theme-aware) · `skeleton-shimmer` (used by `ui/skeleton`) · `check-path` · `.numeric` (tabular numerals for money and counts; opt-in).

## Brand deltas from the registry

Re-apply these after any `shadcn add --overwrite`.

| File | Delta | Why |
|---|---|---|
| `ui/button.tsx` | `font-semibold`; sizes `sm` h-9 `text-label`, `default` h-10, `lg` h-12 `text-subtitle`, `icon` size-10, **+`icon-sm`** size-9; `link` uses `text-link`; **+`inverse`**, **+`success`** variants | presentation `Button` sizes and variants |
| `ui/badge.tsx` | `px-2.5 text-label font-semibold`; **+tones** `brand violet money amber red neutral` | presentation `Badge` |
| `ui/input.tsx` | `h-10` | presentation `Input` |
| `ui/card.tsx` | `rounded-md` (8px), `shadow-xs` | presentation `Card` |
| `ui/skeleton.tsx` | `skeleton-shimmer` instead of `animate-pulse` | presentation `.skeleton` |
| `ui/sheet.tsx` | logical `side` (`start`/`end`/`top`/`bottom`, default `end`); required `closeLabel` prop instead of English "Close"; card surface, `shadow-panel` | RTL and i18n hard rules |
| `ui/dialog.tsx` | **pending FE-FND-08:** still renders English "Close" | — |
| `ui/sonner.tsx` | defaults `position="bottom-center"`, `duration={3200}`, tone `icons` (lucide `CircleCheck`/`CircleAlert`/`Info`/`TriangleAlert`, tints `money-500`·`red-500`·`brand-400`·`amber-500`; `dark:` `money-600`/`amber-700` for ≥3:1 on the white surface) merged under any caller `icons`; i18n region/close labels; the inverse surface, metrics, focus rings, description, close/cancel colours are in `globals.css` (`html .toaster[data-sonner-toaster] …`) — `richColors` stays an opt-in | presentation `ui/Toast` @ `efc3a57` (FE-FND-06) |

Presentation variant names → ours: `primary`/`pay` → `default` · `dark` → `inverse` · `ghost` (bordered) and `outline` → `outline` · `danger` → `destructive`.

## Dark mode

`next-themes` with `attribute="class"`, `defaultTheme="light"`, `enableSystem`, mounted in `src/components/providers/app-providers.tsx`; `<html>` carries `suppressHydrationWarning`. The theme switch UI is task `FE-FND-04`. Elevation in dark: page `ink-950` → muted surface `ink-900` → card `ink-800`. Write every surface so it survives the class flip: semantic tokens only, no fixed `text-black` / `bg-white`. A permanently dark section is its own case and must be stated as such.

## Fonts

`font-sans` = `var(--font-brand, Ravi), Ravi, Vazirmatn, IRANSansX, IRANSans, Tahoma, system…`. `--font-brand` is unset until `FE-FND-03` self-hosts the chosen face with `next/font/local` (Ravi vs Vazirmatn is `FQ-1`); until then a locally installed face is used. The `var()` carries a fallback deliberately — an undefined `var()` with no fallback invalidates the entire `font-family` declaration (the bug this replaced). **Never `next/font/google`**: a build-time fetch, unreliable from Iran.

## RTL

- `fa` is the default locale and renders **RTL**; the locale layout sets `dir` on `<html>` from `getDirection(locale)` in `src/i18n/routing.ts`.
- No RTL stylesheet and no `dir`-specific CSS, by design. Correct RTL comes from **logical properties**: `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`, `border-s`/`border-e`, `rounded-s`/`rounded-e`. Physical forms (`ml-`, `pr-`, `left-`, `text-left`, `text-right`) are bugs in `fa` unless the thing genuinely is physically placed. The presentation's global `text-align: right` on inputs is **not** ported — `dir` does it.
- `tw-animate-css` 1.4 has logical slides: `slide-in-from-start|end`, `slide-out-to-start|end` (used by `ui/sheet`).
- Mirror directional glyphs with `rtl:rotate-180`. Progress fills, carousels, sliders and drag handles must be looked at in `fa`, not reasoned about.
- Mixed-direction runs (a Latin handle, a URL, an amount with a unit) need an isolating wrapper.
- Verify in both directions. A screenshot in `en` tells you nothing about `fa`.
