---
paths:
  - "src/lib/api/**"
  - "src/features/*/api/**"
  - "src/app/[locale]/**"
  - "src/proxy.ts"
---

# Access control: guardrails for code that touches gated content or identity

Procedure and the decision order are in the skill `content-gating`; domain facts are in `.claude/references/fellowa-domain.md`. When you open one of these files:

- **The server decides, the client displays.** The backend resolves one access level per viewer per piece of content (`FULL` / `PARTIAL` / `TEASER` / `DENY`). The client reads that level and renders the matching state. It never derives entitlement from a membership object, a tier id, a date comparison or a price.
- **A gated body must not be in the payload.** If the level is `TEASER` or `DENY`, the body, the full media URLs and the tier-only fields are absent from the response — that is the backend's contract, and a response that contains them is a backend bug to report, not something to work around by hiding fields. Never fetch a full resource and render a subset; never `filter` or `slice` a payload to simulate gating; never leave gated data in props, an RSC payload, a query cache entry or the HTML.
- **CSS and conditional rendering are not access control.** `hidden`, `display:none`, a blur, a truncation, an early `return null` — all of these ship the data to the browser. If you can see it in the network tab or the HTML source, it is disclosed.
- **One access level, one place.** Do not add a second notion of "can this user see it" (a helper, a hook, a boolean prop computed locally). Where the UI needs to branch, it branches on the server-provided level.
- **Caching.** A per-viewer response is never cached where another viewer can read it: no `"use cache"` or static rendering on a route whose content depends on the viewer, and the viewer-dependent inputs belong in the query key. A long `staleTime` on a gated resource serves a stale `TEASER` after a successful purchase — invalidate on the mutation that changes membership instead.
- **Context is not a session mode.** A page view and a memberships view are different requests (`?context=page|memberships`), different query keys and different cache entries. Never store "which mode am I in" in client state and reuse one cached response for both.
- **One account type.** There is no creator role flag, no `is_creator`, no switch-role action. A user who has a page is a creator by virtue of the relation. Never add a role toggle, a role-shaped conditional or a "creator mode" to the UI.
- **Self-interaction.** A user cannot subscribe to, tip, or report their own page. The backend enforces it; the UI must not offer the action, and must not rely on the UI alone.
- **Payment.** The client never sends an amount, never marks a purchase paid, and never treats a gateway redirect as success. Status comes from the server after its own verification, and the return handler must be safe to run twice (a second callback must not double-apply).
- **Auth transport.** How the access token reaches `apiClient` is a single registered provider (`setAccessTokenProvider`). Do not read or write tokens anywhere else, do not put one in `localStorage`-backed persisted state, a query key, a URL or a log, and do not add a second auth path.
- **Secrets.** Only `NEXT_PUBLIC_*` values may be referenced in client code. Anything else in `src/lib/env.ts` is server-only; importing it into a client component ships it.
