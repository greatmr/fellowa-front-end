import type { Config } from 'tailwindcss'

/**
 * Fellowa design tokens — the single source of raw design values.
 *
 * Origin: the design prototype in `../presentation` (`src/index.css` @theme,
 * plus the values its newer screens hardcode), ported 2026-10-14 at
 * presentation commit 133c779. See `.claude/references/ui-and-theme.md` and
 * `../.claude/tasks/frontend/presentation-sync.md`.
 *
 * Layering:
 *   1. This file      — brand primitives: palettes, type scale, radii,
 *                       shadows, gradients, motion. Loaded by globals.css with
 *                       `@config`. The ONLY file allowed to contain a hex value.
 *   2. globals.css    — semantic tokens (background, primary, muted, …) per
 *                       theme, derived from (1) with `--theme()`.
 *   3. Components     — use semantic tokens first; palette scales only for
 *                       brand accents (money, violet, status tints).
 *
 * Tailwind v4 note: values from a JS config generate utilities but are NOT
 * emitted as CSS variables, so `var(--color-brand-600)` is undefined at
 * runtime. Reference them in CSS with `--theme(--color-brand-600)`.
 */

const palette = {
  /** Trust Blue — primary actions, links, focus. */
  brand: {
    50: '#EEF3FC',
    100: '#DCE6F9',
    200: '#B6C9F1',
    300: '#86A5E6',
    400: '#5580D8',
    500: '#3464CC',
    600: '#2050C0',
    700: '#1A42A0',
    800: '#15357F',
    900: '#0F265C',
  },
  /** Creative Violet — membership, paywall, creator accents. */
  violet: {
    50: '#F4EEFC',
    100: '#E8DCF8',
    200: '#D0BAF1',
    300: '#B292E7',
    400: '#9368DD',
    500: '#8250D7',
    600: '#753BD1',
    700: '#5F2EAD',
    800: '#4A2487',
    900: '#351A61',
  },
  /** Success Green — earnings, paid, active. */
  money: {
    50: '#E7F9F3',
    100: '#C4F0E1',
    300: '#5ED9B4',
    400: '#2ECB9C',
    500: '#0CBF8C',
    600: '#08845F',
    700: '#077A58',
  },
  /** Warning Amber. */
  amber: {
    50: '#FEF7E8',
    100: '#FDEBC5',
    300: '#FBD27F',
    400: '#FAC65E',
    500: '#F9BB3E',
    600: '#D99A1C',
    700: '#8A5A00',
  },
  /** Error Red. */
  red: {
    50: '#FEEFEF',
    100: '#FDDADA',
    300: '#FA9A9A',
    400: '#F87B7B',
    500: '#F75C5C',
    600: '#D63C3C',
    700: '#B32E2E',
  },
  /**
   * Neutrals, Graphite Black → Gallery White.
   * 25/150/250/550/650 were hardcoded as hex in the presentation's auth,
   * landing and settings screens (#FAFAFB, #EDEDF0, #D6D6DA, #5B6472,
   * #40434C) and are named here instead of copied.
   * 950 is referenced by the presentation (`bg-ink-950`) but never defined
   * there; its value is a front-end decision pending design confirmation.
   */
  ink: {
    25: '#FAFAFB',
    50: '#F7F7F8',
    100: '#EFEFEF',
    150: '#EDEDF0',
    200: '#E2E3E5',
    250: '#D6D6DA',
    300: '#C6C8CC',
    400: '#90949B',
    500: '#6B6F76',
    550: '#5B6472',
    600: '#4E5157',
    650: '#40434C',
    700: '#3A3D42',
    800: '#1C1D1F',
    900: '#101010',
    950: '#0A0A0B',
  },
  mist: '#90949B',
  /**
   * Google's mark (sign-in button, FE-AUTH-04). Brand-mandated values, used
   * only for the "G" glyph.
   */
  google: {
    blue: '#4285F4',
    green: '#34A853',
    yellow: '#FBBC05',
    red: '#EA4335',
  },
} as const

/**
 * Type scale. Named roles replace the presentation's ~20 arbitrary pixel
 * sizes (text-[11px], text-[12.5px], …); see the mapping table in
 * `.claude/references/ui-and-theme.md`. Tailwind's default `text-xs`…
 * `text-9xl` remain available.
 */
export const fontSize = {
  micro: ['0.625rem', { lineHeight: '0.875rem' }], // 10px
  caption: ['0.6875rem', { lineHeight: '1rem' }], // 11px
  label: ['0.75rem', { lineHeight: '1.125rem' }], // 12px
  'body-sm': ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
  body: ['0.875rem', { lineHeight: '1.375rem' }], // 14px
  'body-lg': ['0.9375rem', { lineHeight: '1.5rem' }], // 15px
  subtitle: ['1rem', { lineHeight: '1.5rem' }], // 16px
  'title-sm': ['1.125rem', { lineHeight: '1.625rem' }], // 18px
  title: ['1.375rem', { lineHeight: '1.875rem' }], // 22px
  headline: ['1.625rem', { lineHeight: '2.125rem' }], // 26px
  display: ['2rem', { lineHeight: '2.5rem' }], // 32px
  /*
   * Fluid marketing headings (presentation `LandingView` @ 798f660, FE-LAND-02):
   * the hero title, a section title and the closing call to action.
   */
  hero: [
    'clamp(2.25rem, 4.4vw, 3.375rem)',
    { lineHeight: '1.3', letterSpacing: '-0.0625rem' },
  ], // 36–54px
  section: [
    'clamp(1.875rem, 3.4vw, 2.75rem)',
    { lineHeight: '1.35', letterSpacing: '-0.04375rem' },
  ], // 30–44px
  closing: [
    'clamp(1.5rem, 2.6vw, 2rem)',
    { lineHeight: '1.5', letterSpacing: '-0.03125rem' },
  ], // 24–32px
} satisfies NonNullable<Config['theme']>['fontSize']

export const borderRadius = {
  /** Compact controls and the shared semantic radius foundation. */
  control: '0.25rem',
  base: '0.625rem',
  /** Large media and profile cards (presentation `--radius-card`). */
  card: '1.25rem',
  /** Popovers and the toast (presentation `rounded-[12px]`, efc3a57). */
  popover: '0.75rem',
  /** The landing's glass feature blocks (presentation `.fw-block`). */
  section: '2.5rem',
} as const

/** Shared shell dimensions, measured from the presentation's studio frame. */
export const spacing = {
  sidebar: '16.5rem',
  'sidebar-collapsed': '4.5rem',
  drawer: '17.5rem',
  /*
   * Side gutter of a studio page (`StudioPage`): 1rem, then 1.5rem from
   * `sm` (presentation `TiersView`/`AudienceView` `px-4 sm:px-6` @ d843c3b).
   */
  gutter: '1rem',
  'gutter-wide': '1.5rem',
} as const

/** The public pages' content width (`max-w-public`). */
const publicWidth = '71.25rem'

export const maxWidth = {
  /*
   * Studio page widths (`StudioPage` `width`), one per presentation view
   * @ d843c3b (FE-SHELL-04): narrow = Settings `max-w-3xl`; medium =
   * Dashboard's inner column `max-w-4xl`; default = Posts, Composer,
   * Explore and the creator profile `max-w-5xl`, and every page with no
   * view of its own; wide = Tiers, Audience, Payouts and Supporter
   * payments `max-w-6xl`.
   */
  'page-narrow': '48rem',
  'page-medium': '56rem',
  'page-default': '64rem',
  'page-wide': '72rem',
  public: publicWidth,
  error: '28rem',
  /*
   * One column of the public page's three-column tier grid at full width
   * (`max-w-public`, `sm:px-6`, `gap-4`): the builder's preview card
   * matches it (presentation `TiersView` `max-w-[285px]` "matching 3-col
   * public grid" @ d843c3b; FE-TIER-03).
   */
  'tier-card': `calc((${publicWidth} - 3rem - 2rem) / 3)`,
} as const

export const boxShadow = {
  soft: '0 2px 10px -4px rgb(16 16 16 / 0.10)',
  panel: '0 24px 60px -24px rgb(16 16 16 / 0.30)',
  /** Glow under a primary call to action. */
  brand: '0 10px 30px rgb(32 80 192 / 0.30)',
  /** Hover lift of an interactive card (`card-tactile`), light and dark. */
  lift: '0 8px 24px -12px rgb(16 16 16 / 0.12)',
  'lift-dark': '0 8px 24px -12px rgb(0 0 0 / 0.45)',
  /** The landing's sticky glass header (presentation `.fw-nav-outer`). */
  nav: '0 8px 32px -20px rgb(32 80 192 / 0.25)',
  /** A glass feature block: soft drop plus a lit top edge (`.fw-block`). */
  block:
    '0 20px 50px -34px rgb(16 16 16 / 0.16), inset 0 1px 0 rgb(255 255 255 / 0.8)',
  /*
   * The studio "create post" button's hover lift and press (presentation
   * `.sidebar-create-btn` @ d843c3b). Pure black/white shadows, as designed.
   */
  'cta-lift': '0 6px 16px -2px rgb(0 0 0 / 0.32)',
  'cta-lift-dark': '0 6px 18px -2px rgb(255 255 255 / 0.22)',
  'cta-press': '0 2px 6px -1px rgb(0 0 0 / 0.20)',
} as const

/** Overlay backdrop blur (presentation `Sheet`, efc3a57). */
export const blur = {
  overlay: '2px',
} as const

/** Named timing functions (presentation `--ease-*`, efc3a57). */
export const transitionTimingFunction = {
  spring: 'cubic-bezier(.175, .885, .32, 1.275)',
  smooth: 'cubic-bezier(.16, 1, .3, 1)',
  'out-quad': 'cubic-bezier(.25, .46, .45, .94)',
  bounce: 'cubic-bezier(.34, 1.56, .64, 1)',
} as const

const ease = transitionTimingFunction

export const animation = {
  shimmer: 'shimmer 1.6s linear infinite',
  'toast-in': `toast-in .26s ${ease.smooth}`,
  'pop-in': `pop-in .18s ${ease.smooth}`,
  'check-draw': 'check-draw .35s ease-out forwards',
  shake: 'shake 200ms ease-in-out',
  'page-enter': `page-enter .24s ${ease.smooth} forwards`,
  'pulse-subtle': 'pulse-subtle 2.2s ease-in-out infinite',
  'badge-pop': `badge-pop .3s ${ease.spring}`,
  /* Ambient sweep across the studio "create post" button (d843c3b). */
  'cta-glint': 'cta-glint 5.5s cubic-bezier(.4, 0, .2, 1) infinite',
  /*
   * Landing ambience (presentation `LandingView` @ 798f660): the hero's
   * drifting colour fields and the mock-ups' floating chips. `float-*` share
   * one keyframe (`chip-float`) with staggered timing so the chips never move in step.
   */
  'drift-1': 'drift-1 26s ease-in-out infinite alternate',
  'drift-2': 'drift-2 30s ease-in-out infinite alternate',
  'drift-3': 'drift-3 34s ease-in-out infinite alternate',
  'float-1': 'chip-float 5.5s ease-in-out infinite alternate',
  'float-2': 'chip-float 6.5s ease-in-out .8s infinite alternate',
  'float-3': 'chip-float 7s ease-in-out .4s infinite alternate',
  'float-4': 'chip-float 6s ease-in-out 1.2s infinite alternate',
  'float-5': 'chip-float 7.5s ease-in-out .2s infinite alternate',
} as const

export const backgroundImage = {
  'cover-brand':
    'radial-gradient(120% 140% at 85% 10%, #86A5E6 0%, #2050C0 45%, #0F265C 100%)',
  'cover-violet':
    'radial-gradient(120% 140% at 15% 15%, #B292E7 0%, #753BD1 45%, #351A61 100%)',
  'cover-mix': 'linear-gradient(135deg, #2050C0 0%, #753BD1 100%)',
  /**
   * The auth frame's visual column and its back sample card (presentation
   * `AuthLayout` @ fdb5f6c). Slate values outside the palette, named here as
   * design drift (presentation-sync, FE-AUTH-04). Dark in both themes.
   */
  'auth-visual':
    'linear-gradient(to bottom right, #10172A 0%, #1E293B 50%, #0F172A 100%)',
  'auth-sample': 'linear-gradient(to top right, #1E293B 0%, #334155 100%)',
  shimmer:
    'linear-gradient(90deg, rgb(16 16 16 / 0.05) 25%, rgb(16 16 16 / 0.10) 37%, rgb(16 16 16 / 0.05) 63%)',
  'shimmer-dark':
    'linear-gradient(90deg, rgb(255 255 255 / 0.05) 25%, rgb(255 255 255 / 0.12) 37%, rgb(255 255 255 / 0.05) 63%)',
  /*
   * The landing hero's fluted glass (presentation `.fw-flutes`,
   * `.fw-flute-edges`, `.fw-grain`): soft vertical ribs, their lit edges and
   * a faint noise. The slate tints (#9EAECC, #92A3C7) are outside the palette
   * and kept as design drift (presentation-sync, FE-LAND-02).
   */
  flutes:
    'repeating-linear-gradient(90deg, rgb(255 255 255 / 0.40) 0px, rgb(255 255 255 / 0.05) 16px, rgb(255 255 255 / 0) 40px, rgb(158 174 204 / 0.09) 60px, rgb(255 255 255 / 0.34) 70px, rgb(255 255 255 / 0.40) 72px)',
  'flute-edges':
    'repeating-linear-gradient(90deg, transparent 0px, transparent 70px, rgb(255 255 255 / 0.8) 70px, rgb(255 255 255 / 0.8) 71px, rgb(146 163 199 / 0.16) 71px, rgb(146 163 199 / 0.16) 72.5px)',
  grain:
    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
  /*
   * The locked-post tile in the landing's content collage (presentation
   * `.fw-cl-locked`), mapped onto brand-300/400/800 and violet-300.
   */
  'locked-mock':
    'radial-gradient(circle at 35% 20%, rgb(134 165 230 / 0.88), transparent 55%), radial-gradient(circle at 65% 80%, rgb(178 146 231 / 0.88), transparent 55%), linear-gradient(170deg, #5580D8, #15357F)',
} as const

const config = {
  theme: {
    extend: {
      colors: palette,
      fontSize,
      fontFamily: {
        /*
         * Persian-first. `--font-brand` is set on <html> by next/font/local in
         * the locale layout (self-hosted Vazirmatn, FQ-1). Outside that layout
         * the named faces resolve from the visitor's system. The var() carries
         * a fallback on purpose: an undefined var() would invalidate the whole
         * font-family declaration.
         * Never next/font/google — a build-time fetch, unreliable from Iran.
         */
        sans: [
          'var(--font-brand, Ravi)',
          'Ravi',
          'Vazirmatn',
          'IRANSansX',
          'IRANSans',
          'Tahoma',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      borderRadius,
      spacing,
      maxWidth,
      boxShadow,
      backgroundImage,
      blur,
      transitionTimingFunction,
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(.95)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(6px) scale(.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'page-enter': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.75', transform: 'scale(.96)' },
        },
        'badge-pop': {
          '0%': { opacity: '0', transform: 'scale(.85)' },
          '60%': { opacity: '1', transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        /* Physical X on purpose: a light sweep, not layout (same in both directions). */
        'cta-glint': {
          '0%, 75%': {
            transform: 'translateX(-160%) skewX(-20deg)',
            opacity: '0',
          },
          '78%, 90%': { opacity: '.9' },
          '96%, 100%': {
            transform: 'translateX(260%) skewX(-20deg)',
            opacity: '0',
          },
        },
        'check-draw': {
          from: { strokeDashoffset: '24' },
          to: { strokeDashoffset: '0' },
        },
        'drift-1': {
          from: { transform: 'translateX(0) scale(1)' },
          to: { transform: 'translateX(40px) scale(1.06)' },
        },
        'drift-2': {
          from: { transform: 'translate(0, 0) scale(1.05)' },
          to: { transform: 'translate(-50px, 40px) scale(1)' },
        },
        'drift-3': {
          from: { transform: 'translate(0, 0)' },
          to: { transform: 'translate(40px, 50px)' },
        },
        /* `--py` is the scroll parallax offset set by `FloatParallax`. */
        'chip-float': {
          from: { transform: 'translateY(var(--py, 0px))' },
          to: { transform: 'translateY(calc(var(--py, 0px) - 12px))' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
      },
      animation,
    },
  },
} satisfies Config

export default config
