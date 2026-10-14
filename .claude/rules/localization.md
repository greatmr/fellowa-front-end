---
paths:
  - "messages/**"
  - "src/i18n/**"
  - "src/proxy.ts"
---

# Localization and RTL

- Two locales: `fa` (default, **RTL**) and `en`. Both are declared in `src/i18n/routing.ts`; `localePrefix` is `as-needed`, so Persian URLs have no prefix and English ones are `/en/...`. Adding a locale means `routing.ts`, a `messages/<locale>.json`, and `rtlLocales` if it is right-to-left.
- `messages/fa.json` is the source of truth for structure: `fa` is the product's language and `en` follows it. **Every key added to one file must exist in the other.** Nothing enforces this yet — check it yourself before reporting work done (`node -e` comparing the two key sets, or read both).
- Add a key in the same change as the code that uses it, in both locales. Keys are camelCase, nested by feature (`post.locked.ctaSubscribe`). Say in the report which translations you drafted rather than took from the design or the story — a machine-drafted Persian string is a draft, not copy.
- Search for an existing key before adding one (`rg -n '"<text>"' messages/`). Shared words (`common.*`, `errors.*`) are shared; feature text lives under the feature's own namespace.
- Read text with `useTranslations` (client) or `getTranslations` (server). Never concatenate translated fragments, never build a key from user data, and never leave a user-facing string in a `.tsx` file.
- Plurals and interpolation use ICU message syntax with **named** parameters (`{count}`, `{creatorName}`), not positional ones.
- **RTL is not a stylesheet.** The locale layout sets `dir` on `<html>`; your job is to use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`) so the layout follows. Directional icons (chevrons, arrows, back buttons) need `rtl:rotate-180` or a mirrored variant. Progress bars, carousels, sliders and anything with a drag direction must be checked in `fa`, not assumed.
- **Numbers, dates and money.** Format through next-intl (`useFormatter` / `getFormatter`) or a shared helper, never by hand. Amounts are integer Toman from the backend — format, never arithmetic (`.claude/references/fellowa-domain.md`). Dates arrive as `timestamptz`; **Jalali is display-only** — convert for display, never store, send or compare a Jalali string.
- Persian digits: pick one behavior per surface and keep it. Mixing Latin and Persian digits in one view is a bug. Use `.numeric` (from `globals.css`) for columns of figures so they align.
