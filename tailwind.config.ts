import type { Config } from "tailwindcss";

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
    50: "#EEF3FC",
    100: "#DCE6F9",
    200: "#B6C9F1",
    300: "#86A5E6",
    400: "#5580D8",
    500: "#3464CC",
    600: "#2050C0",
    700: "#1A42A0",
    800: "#15357F",
    900: "#0F265C",
  },
  /** Creative Violet — membership, paywall, creator accents. */
  violet: {
    50: "#F4EEFC",
    100: "#E8DCF8",
    200: "#D0BAF1",
    300: "#B292E7",
    400: "#9368DD",
    500: "#8250D7",
    600: "#753BD1",
    700: "#5F2EAD",
    800: "#4A2487",
    900: "#351A61",
  },
  /** Success Green — earnings, paid, active. */
  money: {
    50: "#E7F9F3",
    100: "#C4F0E1",
    300: "#5ED9B4",
    400: "#2ECB9C",
    500: "#0CBF8C",
    600: "#08845F",
    700: "#077A58",
  },
  /** Warning Amber. */
  amber: {
    50: "#FEF7E8",
    100: "#FDEBC5",
    300: "#FBD27F",
    400: "#FAC65E",
    500: "#F9BB3E",
    600: "#D99A1C",
    700: "#8A5A00",
  },
  /** Error Red. */
  red: {
    50: "#FEEFEF",
    100: "#FDDADA",
    300: "#FA9A9A",
    400: "#F87B7B",
    500: "#F75C5C",
    600: "#D63C3C",
    700: "#B32E2E",
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
    25: "#FAFAFB",
    50: "#F7F7F8",
    100: "#EFEFEF",
    150: "#EDEDF0",
    200: "#E2E3E5",
    250: "#D6D6DA",
    300: "#C6C8CC",
    400: "#90949B",
    500: "#6B6F76",
    550: "#5B6472",
    600: "#4E5157",
    650: "#40434C",
    700: "#3A3D42",
    800: "#1C1D1F",
    900: "#101010",
    950: "#0A0A0B",
  },
  mist: "#90949B",
} as const;

/**
 * Type scale. Named roles replace the presentation's ~20 arbitrary pixel
 * sizes (text-[11px], text-[12.5px], …); see the mapping table in
 * `.claude/references/ui-and-theme.md`. Tailwind's default `text-xs`…
 * `text-9xl` remain available.
 */
export const fontSize = {
  micro: ["0.625rem", { lineHeight: "0.875rem" }], // 10px
  caption: ["0.6875rem", { lineHeight: "1rem" }], // 11px
  label: ["0.75rem", { lineHeight: "1.125rem" }], // 12px
  "body-sm": ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
  body: ["0.875rem", { lineHeight: "1.375rem" }], // 14px
  "body-lg": ["0.9375rem", { lineHeight: "1.5rem" }], // 15px
  subtitle: ["1rem", { lineHeight: "1.5rem" }], // 16px
  "title-sm": ["1.125rem", { lineHeight: "1.625rem" }], // 18px
  title: ["1.375rem", { lineHeight: "1.875rem" }], // 22px
  headline: ["1.625rem", { lineHeight: "2.125rem" }], // 26px
  display: ["2rem", { lineHeight: "2.5rem" }], // 32px
} satisfies NonNullable<Config["theme"]>["fontSize"];

export const borderRadius = {
  /** Compact controls and the shared semantic radius foundation. */
  control: "0.25rem",
  base: "0.625rem",
  /** Large media and profile cards (presentation `--radius-card`). */
  card: "1.25rem",
} as const;

/** Shared shell dimensions, measured from the presentation's studio frame. */
export const spacing = {
  sidebar: "16.5rem",
  "sidebar-collapsed": "4.5rem",
  drawer: "17.5rem",
} as const;

export const maxWidth = {
  content: "64rem",
  public: "71.25rem",
  error: "28rem",
} as const;

export const boxShadow = {
  soft: "0 2px 10px -4px rgb(16 16 16 / 0.10)",
  panel: "0 24px 60px -24px rgb(16 16 16 / 0.30)",
  /** Glow under a primary call to action. */
  brand: "0 10px 30px rgb(32 80 192 / 0.30)",
} as const;

export const backgroundImage = {
  "cover-brand":
    "radial-gradient(120% 140% at 85% 10%, #86A5E6 0%, #2050C0 45%, #0F265C 100%)",
  "cover-violet":
    "radial-gradient(120% 140% at 15% 15%, #B292E7 0%, #753BD1 45%, #351A61 100%)",
  "cover-mix": "linear-gradient(135deg, #2050C0 0%, #753BD1 100%)",
  shimmer:
    "linear-gradient(90deg, rgb(16 16 16 / 0.05) 25%, rgb(16 16 16 / 0.10) 37%, rgb(16 16 16 / 0.05) 63%)",
  "shimmer-dark":
    "linear-gradient(90deg, rgb(255 255 255 / 0.05) 25%, rgb(255 255 255 / 0.12) 37%, rgb(255 255 255 / 0.05) 63%)",
} as const;

const config = {
  theme: {
    extend: {
      colors: palette,
      fontSize,
      fontFamily: {
        /*
         * Persian-first. `--font-brand` is set by next/font/local once the
         * font files are self-hosted (task FE-FND-03); until then the named
         * faces resolve from the visitor's system. The var() carries a
         * fallback on purpose: an undefined var() would invalidate the whole
         * font-family declaration.
         * Never next/font/google — a build-time fetch, unreliable from Iran.
         */
        sans: [
          "var(--font-brand, Ravi)",
          "Ravi",
          "Vazirmatn",
          "IRANSansX",
          "IRANSans",
          "Tahoma",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius,
      spacing,
      maxWidth,
      boxShadow,
      backgroundImage,
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(10px) scale(.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "check-draw": {
          from: { strokeDashoffset: "24" },
          to: { strokeDashoffset: "0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "toast-in": "toast-in .28s cubic-bezier(.2, .9, .3, 1.2)",
        "pop-in": "pop-in .18s ease-out",
        "check-draw": "check-draw .45s .1s ease-out forwards",
        shake: "shake 200ms ease-in-out",
      },
    },
  },
} satisfies Config;

export default config;
