# Fellowa domain terms (as used in the stories, the design packages and the backend; verify against code)

Fellowa is a Persian creator-subscription platform: creators publish posts, fans buy a membership tier for monthly access, payment runs through Zarinpal in Toman, and creators are paid out. Where a term below is not in your code search, it is not a concept of this system — do not introduce it.

## Core objects

- **User / account.** **One account type.** There is no creator role, no `is_creator` flag, no "switch to creator" action, no separate creator signup. A user who owns a page *is* a creator by virtue of that relation. Never add a role toggle, a role-shaped conditional, or a "creator mode" to the UI.
- **Page.** A creator's public space: handle, name, bio, cover, tiers, posts. One page per creator. The page is the unit of membership, of payout and of most authorization questions.
- **Tier.** A paid membership level on a page: name, monthly price, benefits, order. **Legacy name: the entity is `Tire`** (a typo that predates the migration) and a purchase is `BuyTire`. Map these at the API boundary; `Tire` must not appear in UI code or copy.
- **Membership.** A user's relationship to a page through a tier. At most **one pending-or-active membership per (user, page)** — enforced by a partial unique index in the target schema. A membership has a status (pending payment → active → expired / cancelled) and carries a **price snapshot**: the tier price at purchase, not the tier's current price. Render the snapshot; a later price change must not retroactively change what someone paid.
- **Post.** A creator's content. Gated by tier: which tiers may see it, or public. Attachments (image, video, audio, file) live in object storage behind the gate.
- **Payout (`CreatorBill`).** A creator's withdrawal of earnings. **One open payout per page** at a time. Creators cannot self-settle; settlement is an operator action.
- **Chat (`ChatLine`) and messages.** Direct conversation between a fan and a creator. Participation is relational: being in a conversation is what grants access to it.
- **Comment, like, tip, report, notification, blog post, landing content.** Each exists; check the module's `api.md` before assuming a shape.

## Access control — the single most important rule

The backend resolves **one access level** per viewer per piece of content:

| Level | Means |
|---|---|
| `FULL` | the whole thing, body and media |
| `PARTIAL` | some of it (e.g. a preview portion), explicitly delimited by the server |
| `TEASER` | metadata and a lock state only; **the body is absent from the payload** |
| `DENY` | not visible at all |

The client **reads** this level and renders the matching state. It never derives entitlement from a membership, a tier id, a date or a price; never fetches a full body and hides part of it; never leaves gated content in a payload, an RSC response, a prop or the HTML. Hiding with CSS or an early `return null` is not access control. Four states means four designs: subscribed, not subscribed, pending payment, own page.

**Context, not session mode.** A page view and a memberships view are different requests (`?context=page|memberships`), different query keys, different cache entries. There is no client-side "which mode am I in".

**Self-interaction.** A user cannot subscribe to, tip, comment-as-stranger on, or report their own page. The UI must not offer the action; the backend guards it.

## Money

- Chargeable amounts are **integer Toman** (the target schema stores four separate integer amounts per transaction — gross, fee, net and tax-equivalent lines; read the module's `api.md` for which fields a response carries). No decimals, no Rial conversion, no currency selector.
- The backend resolves every chargeable amount. The client **never** computes, scales, rounds or sums one, and never sends a client-derived amount as authoritative.
- Always render an amount with its unit ("۱۲۰٬۰۰۰ تومان"), through one shared formatter. An amount with no unit is a bug.
- A display-only derivation (per-month equivalent, difference from another tier) is acceptable when it derives from server fields in one place and keeps the unit attached.

## Payments (Zarinpal)

A purchase is: create the membership as **pending** → send the user to the gateway → the gateway returns → **the server verifies** and only then activates. Consequences for the UI:

- A return from the gateway is **not** success. Show a verifying state and read the status the server reports.
- The verification must be **idempotent**: a second callback, a refresh or a double-click must not double-apply. Never treat a client-side "already handled" flag as the guard.
- Failure, cancellation and timeout are first-class states, not an error toast.
- Payments are reconciled server-side; the client never reconciles or retries a charge on its own.

## Dates and locale

- The backend stores `timestamptz`. **Jalali (Persian calendar) is display-only** — convert when rendering, never store, send, compare or round-trip a Jalali string.
- The product language is Persian, RTL. `fa` is the default locale; `en` exists so copy is never hardcoded.

## Rules that follow from the domain

Gated content must never leak, in any form, at any layer. Amounts always carry a unit and are never computed on the client. A membership's price is the snapshot, not the current tier price. Payment status comes from the server after verification and the return path must be re-runnable. One account type, so no role branching. Expired, pending, cancelled and own-page are normal states that every membership-aware view must handle.
