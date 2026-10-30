# Presentation → front-end mapping (facts as of presentation `133c779`)

Lookup tables for porting a file from `../presentation/src`. Procedure: skill `presentation-port`. Token system: `ui-and-theme.md`. Ecosystem rules: `../../.claude/rules/frontend-presentation.md`.

## Colors
| In the presentation | Write in front-end |
|---|---|
| `bg-white dark:bg-ink-800` (cards, panels) | `bg-card` |
| `bg-[#FAFAFB]`, `bg-ink-50/40 dark:bg-ink-950` (page) | `bg-background` |
| `text-ink-900 dark:text-white`, `text-[#101010]` | `text-foreground` |
| `text-ink-600`, `text-ink-500`, `text-[#5B6472]`, `dark:text-ink-100/85` | `text-muted-foreground` |
| `text-[#40434C]` (strong secondary text) | `text-ink-650 dark:text-ink-200` — or `text-foreground` if it is really body text |
| `border-ink-900/[.07] dark:border-white/[.08]`, `border-[#EDEDF0]` | `border` (`border-border`) |
| `border-ink-900/12`, `border-[#D6D6DA]` (controls) | `border-input` |
| `bg-brand-600`, `bg-[#2050C0]` (action) | `bg-primary text-primary-foreground` |
| `hover:bg-brand-700`, `hover:bg-[#1A45A8]` | `hover:bg-primary/90` |
| `text-brand-600` as a link | `text-link` |
| `bg-ink-900/5`, `hover:bg-ink-900/5`, `dark:hover:bg-white/5` | `bg-accent` / `hover:bg-accent` |
| `bg-red-600`, `#F75C5C` destructive action | `bg-destructive text-destructive-foreground` (`text-destructive` for error text) |
| `bg-money-500` with white text | `bg-success text-success-foreground` (money-500 fails AA with white) |
| `focus:ring-brand-500/40`, `focus:border-ink-950` | the primitive's own focus style (`ring-ring/50`); do not restyle focus per screen |
| status tints (`bg-violet-50 text-violet-700 …`) | `<Badge variant="violet">` etc., or palette utilities for decoration |
| `emerald-*`, `blue-*`, `rose-*`, `sky-*`, `pink-*` | the nearest brand family: `money`, `brand`, `red` (`FQ-8`) |
| any other hex | stop: add or map a token in `tailwind.config.ts`, log the drift in the ledger |

## Sizes
Font sizes → the named scale in `ui-and-theme.md` (`text-[12px]` → `text-label`, `text-[14px]` → `text-body`, …). Radius: `rounded-[8px]` → `rounded-md`, `rounded-[12px]` → `rounded-xl` (14; accept the 2px), `rounded-[20px]` → `rounded-card`, `rounded-[4px]` → `rounded-sm`. Shadows: `shadow-panel`, `shadow-soft` as named; `shadow-[0_10px_30px_rgba(32,80,192,0.3)]` → `shadow-brand`.

## Components
| Presentation | Front-end |
|---|---|
| `ui/Button` `primary`/`pay`, `dark`, `ghost`, `outline`, `danger` · sizes `sm`, `default`, `lg`, `icon`, `icon-sm` | `ui/button` `default`, `inverse`, `outline`, `outline`, `destructive` · same size names |
| `ui/Badge` tones | `ui/badge` tones of the same names |
| `ui/Card`, `CardHeader`, `CardTitle`, `CardContent` | `ui/card` (padding differs: shadcn `py-6 px-6`; pass `className` for the presentation's `p-5` only where it matters) |
| `ui/Input`, `ui/Textarea` | `ui/input`, `ui/textarea` (inside `ui/form` with react-hook-form) |
| `ui/Sheet` (`open`, `onClose`, `title`, `footer`) | `ui/sheet`: `<Sheet open onOpenChange><SheetContent closeLabel={t("common.close")}><SheetHeader><SheetTitle>…` |
| `ui/EmptyState` (`actionLabel` + `onAction`) | `common/empty-state` with an `action` node |
| `ui/ErrorState` (`onRetry`) | `common/error-state` with an `action` node; default copy from `errors.*` |
| `ui/Skeleton` | `ui/skeleton` |
| `ui/Toast` / `useToast().showToast` | `toast()` from `sonner` |
| `ui/Switch`, `ui/Checkbox`, `ui/SelectDropdown` | not yet — `FE-FND-05` |
| `.cover-brand`/`.cover-violet`/`.cover-mix`/`.logo-mark` | `bg-cover-brand` / `bg-cover-violet` / `bg-cover-mix` |
| `.teaser-fade`, `.no-scrollbar`, `.custom-scrollbar`, `.skeleton` | `teaser-fade`, `no-scrollbar`, `scrollbar-thin`, `skeleton-shimmer` |
| `.toast-anim`, `.pop-anim`, `.auth-shake`, `.check-path` | `animate-toast-in`, `animate-pop-in`, `animate-shake`, `check-path animate-check-draw` |
| `.divider-paywall` (label in CSS `content:`) | a component with an i18n label — FE-CONT-01 |

## Behaviour and data — never ported
| Presentation | Front-end replacement |
|---|---|
| `currentView` state + `?view=` + `popstate` + `postMessage` router (`App.tsx`) | App Router routes (`migration-plan.md` route map); `Link`/`useRouter` from `@/i18n/navigation` |
| `localStorage` theme | `next-themes` (`FE-FND-04`) |
| `auth-service.ts` (`localStorage` user DB, sessions, masked phone, interests) | the API via `apiClient` and TanStack Query, once `C-4` is decided |
| `session.isCreator` | creator capability = owns a page (`FEL-USER-S01`); no role flag, no mode switch |
| `mockData.ts`, `topics.ts`, Unsplash avatar URLs | server data from the API; images through `next/image` with an allow-listed host |
| `types.ts` | types from `../back-end/docs/modules/<m>/api.md` + the real DTOs |
| `toFaDigits` | next-intl `format.number` (the active locale supplies the digits); no digit map |
| `formatToman` | `useFormatMoney` / `<Money />` in `components/common/money.tsx` (`FE-FND-07`); no other money formatter |
| `parseFaNumber`, `toEnglishDigits` | `toLatinDigits` in `lib/digits.ts`, for input only |
| hardcoded Persian strings | keys in `messages/fa.json` **and** `messages/en.json` |
| `text-right`, `right-0.5`, `-translate-x-5`, `left-0` | logical: `text-start`, `end-0.5`, `rtl:` variants, `start-0`/`end-0` |
