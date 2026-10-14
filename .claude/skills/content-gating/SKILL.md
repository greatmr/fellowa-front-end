---
name: content-gating
description: Decision procedure for anything in the Fellowa frontend that touches gated content, memberships, tiers, payment state or identity - which access level drives which UI state, where the decision is allowed to live, how to render locked content without ever shipping it, the four membership states every such view must handle, and the payment-return rules. Use when a requirement mentions a paid post, a tier, subscribing, a locked or teaser state, "only subscribers", a payout, a tip, or when you touch posts, memberships or payment code.
---

Domain facts are in `.claude/references/fellowa-domain.md`. File-level guardrails load from `.claude/rules/access-control.md`. This skill is the decision procedure.

## The model in one paragraph

The backend resolves **one access level** per viewer per piece of content — `FULL`, `PARTIAL`, `TEASER` or `DENY` — and the response carries only what that level permits. The client reads the level and renders the matching state. It does not know how the level was decided and must not try to re-derive it: not from a membership object, not from a tier id, not from a price, not from an expiry date. A page view and a memberships view are separate requests (`?context=page|memberships`), separate keys and separate cache entries. There is one account type, so no role branching anywhere. Keep it that way.

## Where does the requirement live? Stop at the first that fits

1. **The server already answers it.** If the question is "may this viewer see this", the answer is in the response. Read it. Most gating tasks end here.
2. **A UI state keyed on the level.** Four levels, four designs. Render the one the server named, including the affordance that moves the viewer forward (subscribe, complete payment, renew).
3. **A separate request.** If the UI needs data the current level withholds (the full body after a purchase), re-fetch — do not reach for a hidden copy. Invalidate the key the mutation affected and let the server answer again.
4. **A backend dependency.** If the level, the field or the gating itself does not exist in the API yet, that is a dependency to name and hand back. It is never something the client can approximate.

There is no step 5. "Compute it on the client" is not an option at any tier of complexity.

## Procedure

1. **Enumerate the viewer states** the view must handle, and design all of them before writing one: signed out · signed in, no membership · membership pending payment · membership active · membership expired or cancelled · **viewer is the creator** (own page). A view that handles only "subscribed / not subscribed" is incomplete.
2. **Find the level in the response** (`rg` the module's `api.md`, then the controller). Confirm what the payload contains at `TEASER` — if the gated body is present, that is a backend defect: report it, and do not build on it. Never write a client-side filter to compensate.
3. **Branch on the level, in one place.** One mapping from level → UI state per view, at the top. Do not scatter `if (hasAccess)` checks, and do not introduce a second local notion of access (a helper, a hook, a boolean prop you computed). Where a child needs to know, pass the server-provided level down.
4. **Render locked states without the content.** The lock, the tier name, the price (with its unit), the subscribe affordance — all from fields the server sent for that level. No blurred real text, no truncated real body, no `hidden`, no `display:none`, no early `return null` over data that is still in the payload. If you can find it in the network tab, the RSC payload or view-source, it is disclosed.
5. **Keep the cache honest.** Viewer-dependent data is never statically rendered or `"use cache"`d. `context` and the resource identity are in the key. A mutation that changes membership or payment status **invalidates** the affected keys — a long `staleTime` is how a user pays and still sees a teaser.
6. **Payment is a server verdict.** Create pending → redirect → return → **server verifies** → status. The return URL is not success: show a verifying state and read the server's status. The handler must be safe to run twice (refresh, double callback, back button) and must not rely on a client flag as the idempotency guard. Failure, cancellation and timeout are designed states.
7. **Money.** Display the server's integer-Toman amount with its unit, through the shared formatter. A membership shows its **price snapshot**, not the tier's current price. No client arithmetic on anything chargeable, and never send an amount.
8. **Self-interaction.** Do not offer subscribe, tip or report on the viewer's own page. The backend guards it; the UI should not present an action that will be refused.
9. **Verify both directions and all states.** Exercise each access level with an MSW fixture, assert the gated text is **absent** from the document (not merely invisible), and look at the locked state in `fa` RTL as well as `en`.

## Anti-patterns (flag in review)

- Computing entitlement on the client: comparing a tier id, a price, `membership.expiresAt`, or counting memberships to decide what to show.
- Fetching the full resource and rendering a subset; filtering, slicing or truncating a payload to simulate gating.
- CSS or conditional rendering over data that is still in props, the cache, the RSC payload or the HTML.
- A second source of truth for access: a `canView` helper, a `useAccess` hook that recomputes, an `isSubscribed` boolean derived locally.
- A role flag, `is_creator`, a "switch to creator" control, or any role-shaped conditional. One account type.
- Storing "which context am I in" in client state and reusing one cached response for both the page and memberships views.
- Treating the gateway return as success; marking a purchase paid client-side; a retry or "already handled" flag standing in for server idempotency.
- Any client-side arithmetic on a chargeable amount; an amount rendered without its unit; the current tier price shown where the snapshot belongs.
- Caching a per-viewer response where another viewer can read it.
- Building a gated view against the current backend without checking whether gating is applied — it is not implemented everywhere yet.
