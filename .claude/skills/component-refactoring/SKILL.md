---
name: component-refactoring
description: Safe procedure for refactoring, splitting, consolidating or migrating React components, hooks, stores and shared types in this project - consumer inventory with ripgrep and the type-checker, pinning current behavior, expand-and-contract for shape changes, moving code across the server/client boundary, deleting the dead path. Use when the task says refactor, extract, split, consolidate duplicates, migrate, rename or replace an existing component, hook, store or API shape - including when porting code in from the presentation prototype.
---

A refactor changes structure and keeps behavior. Anything that changes behavior is a separate, visible step. Scope to the path you are already changing; if the cleanup is larger than the feature, stop and propose it as its own piece of work. Shared-code refactors are Tier 3: get the Architect's plan first.

## Loop

1. **Inventory consumers.** `rg` for the symbol's imports, its JSX usage (`<ComponentName`), re-exports in a feature's `index.ts`, dynamic imports, and string references the compiler cannot see — message keys, query keys, route segments, `data-slot` and `data-testid` values. Then change the signature and run `npm run typecheck`: it will name every typed consumer faster than reading will. Write the list down; it is your regression checklist.
2. **Pin current behavior, including the odd parts.** Use existing tests where they exist. For logic-heavy or high-fan-out code add a characterization test while it is still cheap (render + role queries, MSW for network; rule `.claude/rules/testing.md`). Where a test is impractical, write a behavior inventory (inputs → outputs, states, events, side effects) and a manual check list in your report. If current behavior looks wrong, pin it anyway and report it as a separate bug; do not fix it silently.
3. **Choose the mechanism.**
   - *Expand-and-contract* when a shape consumers depend on changes (props, a hook's return, store state, a response type): add the new shape beside the old, migrate consumers one at a time, then remove the old.
   - *Replace wholesale* (strangler) when swapping a hand-rolled component for a shadcn primitive: route consumers to the new one gradually.
   - *Consolidate duplicates*: compare them first and **list the differences**, which are often intentional and undocumented. Extract the shared logic into a hook; only then decide whether the markup can merge. Take unexplained visual differences to the user or the design.
   - *Move across the server/client boundary*: this is a behavior change in disguise. Data that was fetched on the server now arrives differently, effects may now run, and a `"use client"` moved upward widens the bundle. Treat it as Tier 3, and verify what re-renders and what is now shipped.
   - *In-place cleanup* for local tidying inside one component.
4. **Change in small steps.** One consumer at a time, one intention per step; keep prop and event names stable unless changing the contract is the point. Run `npm run typecheck` after each step.
5. **Delete.** Remove what the change made dead: the old component, branch, prop, adapter, helper, and message keys no other file uses (`rg` the key first). A refactor that only adds has not finished.
6. **Verify.** `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` if routing, caching or config moved. Walk the consumer list. Check mobile and desktop widths, `fa` RTL, dark mode, and every access level the view can be in.
7. **Report.** What you pinned, what you changed, what you deleted, what you deliberately left alone, and any pinned behavior that looks like a bug.

## Porting from `../presentation`

Use skill **`presentation-port`** — it is the procedure, and `.claude/references/presentation-mapping.md` is the lookup table. The points below are the short version.


The prototype is React 19 + Vite with no router, no i18n, no API layer and Tailwind wired through a Vite plugin. When a task brings code across — which is its own task, not a side effect of another one:

- Treat it as **material, not precedent.** The target shapes are this project's: `features/`, logical CSS properties, next-intl keys, tokens from `tailwind.config.ts` / `globals.css`, `apiClient` for requests, server components where possible.
- Its hardcoded copy becomes message keys in **both** locales; its hardcoded colors become tokens; its physical CSS properties become logical ones; its `@google/genai` and express pieces are out of scope unless a task says otherwise.
- Port one surface at a time, verified, rather than copying the tree and fixing it afterwards.

## Do not

- Rewrite, or restructure beyond the path in front of you.
- Introduce an abstraction for a requirement nobody has stated.
- Mix a refactor into a bug fix.
- Rename or move files without checking feature barrels, route segments and string keys.
- Hand-edit a vendored `src/components/ui/` file to make a refactor convenient; keep it updatable.
- Leave a "legacy" copy behind.

## Stop and hand back when

You cannot find a seam without changing behavior; the current behavior is materially wrong and someone must decide what correct means; the refactor would require a backend change; or the work outgrew the task. A written consumer map plus pinned tests is a legitimate stopping point.
