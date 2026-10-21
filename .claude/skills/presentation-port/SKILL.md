---
name: presentation-port
description: Port a screen, component or token change from ../presentation (the Vite design prototype) into this Next.js app under this project's standards. Use for any FE-… task whose source is a presentation file, or whenever code, styles or copy are being brought across from ../presentation.
argument-hint: "<FE task id>"
---
# Presentation port

**Objective:** the screen looks and behaves as designed in the prototype, and is built as if this project had written it — not a copy of the prototype with fixes on top.

Inputs: the `FE-…` task in `../.claude/tasks/frontend/tasks.md` · its row(s) in `../.claude/tasks/frontend/presentation-sync.md` · `.claude/references/presentation-mapping.md` · `.claude/references/ui-and-theme.md` · rules `../.claude/rules/frontend-presentation.md`.

## Workflow

1. **Gate.** The task must be `Ready` (not `Ready after X` with X open, not `Blocked`). Its basis (story / `DS-…` / Phase-1 story) is named. Anything the task lists under "must not port" stays out. If the presentation file contains a feature the task does not cover (goals, wallets, interests…), leave it out and say so.

2. **Read the source at the ledger's SHA**, not at the current upstream tip:
   ```
   git -C .. show <sha>:src/components/<File>.tsx
   git -C .. log --oneline <sha>..presentation/main -- src/components/<File>.tsx   # moved since? tell the user
   ```
   Fetch upstream objects first from the workspace root with `bash scripts/git-sync.sh fetch presentation`; these commands inspect original upstream SHAs, while local prototype files reflect the last subtree import.
   Inventory it before writing anything: every visual **state** (normal, loading, empty, error, disabled, locked/teaser, pending), every interaction, every string, every color/size literal.

3. **Map, then build in this project's shape.**
   - Route in `src/app/[locale]/(group)/…` stays thin; the screen lives in `src/features/<feature>/components/`. Server component by default; `"use client"` on the interactive leaf only.
   - Primitives from `src/components/ui` and `src/components/common` — use the mapping table; never recreate a presentation `ui/*` file.
   - Colors, sizes, radii, shadows: semantic tokens, then palette utilities, per the mapping table. A value with no token → add it to `tailwind.config.ts` (tier 3: architect review) and log it in the ledger's drift table. **Never** paste a hex or an arbitrary px.
   - Every string → `messages/fa.json` **and** `en.json`, under the feature's namespace. The prototype's Persian is the `fa` source; the `en` text is a draft — say so in the report.
   - Physical CSS → logical; directional icons `rtl:rotate-180`.
   - Data: none from the prototype. If the task has an API, type it from `api.md` + the real DTO (skill `api-integration`); if it has none, the screen takes props or renders its empty state — no mock arrays in `src/`.

4. **Strip what never ports:** the view router, `postMessage`, `localStorage`, `auth-service`, `mockData`, `types.ts`, `isCreator`, Unsplash URLs, `@google/genai`/express pieces.

5. **Validate** (`.claude/CLAUDE.md` → Validation): typecheck, lint, test; `build` when routes or config changed. Look at it in `fa` and `en`, light and dark, mobile and desktop, if a browser is available; otherwise list that as Not verified.

6. **Record.** Update the task's `Status` line in `../.claude/tasks/frontend/tasks.md` with the evidence (never `Done` — the user confirms), and set the ported file's row in `presentation-sync.md` to **ported** / **partial** with the date and front-end paths. Report drift you found in the prototype.

## Do not
Edit `../presentation`. Port two screens in one change. Add a dependency without the user. Invent an endpoint, field or enum to make a prototype screen work.
