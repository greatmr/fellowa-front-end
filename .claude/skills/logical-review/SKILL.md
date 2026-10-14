---
name: logical-review
description: Checklist for logic-heavy changes in this project - contradictory conditions, impossible branches, boolean grouping, nullability, stale async results and races, effect loops, fallback order, dialog and state priority, duplicated sources of truth, and the payment-return and access-level edges. Use when you modify conditionals, effects, async flows, dialogs, filters, membership or payment state, or when reviewing such a diff.
---

Apply to the lines you changed *and* the code that reads the same state. Write the reasoning down briefly (a truth table or a state list beats "looks fine"); report only real findings, each with the concrete inputs that break it.

## 1. Conditions

- List the inputs of each condition and enumerate the combinations that can actually occur. Which branch wins for each? Is any branch unreachable because an earlier one always matches, or are two true at once?
- **Access levels and membership states are not booleans.** `FULL | PARTIAL | TEASER | DENY` crossed with signed-out · no membership · pending · active · expired · own-page is the real space. A ternary on `isSubscribed` has already collapsed it. Make the `switch` exhaustive with a `never` check so a new level cannot fall through silently.
- Check grouping: `a && b || c`, negations over groups, inverted derived values, `!!` on values where `0` or `""` are valid. Prefer `??` over `||` unless a falsy fallback is intended — a free tier at price `0` and a count of `0` are real values.
- Contradictory guards: a condition required by one branch and forbidden by another; a button disabled by one rule whose handler re-checks a different one.
- Fallback order is explicit and intended: server response → URL param → stored preference → code default. Know which wins when each is missing or stale.

## 2. Nullability and data shape

- API data is optional until proven otherwise: array vs `undefined`, empty string vs missing, `0` vs missing, an enum value the type does not list (the backend is mid-migration; a legacy row can carry a value the new type omits).
- Check the first render before data arrives, the render after an error, and the render when the list is empty — three different states, three designs.
- `Promise.all` and sequential awaits: what state remains if the second call fails? Does the loading flag reset in a `finally`?

## 3. Async, staleness and races

- When an input changes while a request is in flight, can the old response be applied to the new inputs? TanStack Query handles this per key — **hand-written `await` handlers, effects and store actions do not.** Compare the current key or id before applying, or abort.
- Is `staleTime` long enough to serve a stale **access level** or **payment status**? After a successful purchase, does the mutation invalidate the keys whose answers changed, or does the user pay and still see a teaser?
- Does the key contain every input, `?context=page|memberships` included? A missing input means one cache entry answering two questions.
- Effects: does the callback write something it depends on (loop)? Does it run twice on mount in dev and is that safe? Is it an effect where a derived value or a server component would do? Is cleanup present for timers, listeners, observers and in-flight requests?
- Debounced search, polling, countdowns (membership expiry, payment timeout): cleared on unmount and on restart? A new request started while an old one is alive?
- Persisted store state: can a value stored before this deploy, or for a different signed-in user, contradict the new code? Nothing viewer-specific belongs in persisted state.

## 4. State priority and duplication

- Dialogs, sheets, toasts and overlays: which wins when two want to open (a payment result, an auth prompt, a confirm)? Can one open while another is mid-transition, or leave the page scroll-locked?
- Duplicate sources of truth: the same fact in the query cache, a store, local state and the URL. Which one is written by whom, and can they disagree after navigation, back/forward or a reset?
- Step flows (choose tier → pay → return → access): can a user reach a step directly by deep link, refresh or back without the state it needs? Does a reset clear every copy?
- Server/client: does a value read on the server and a value read on the client agree at hydration? A hydration mismatch on a gated view is a correctness bug, not a warning to suppress.

## 5. Domain edges

The payment return handled twice (refresh, double callback, back button) must not double-apply, and a client-side "already handled" flag is not the guard. A gateway return is not success. A membership shows its price snapshot, not the current tier price. An amount of `0` is a real amount and must still carry its unit. The creator viewing their own page is not a subscriber and not a stranger. An expired membership is not the same as no membership. Jalali dates are display-only — a comparison or a round-trip through one is a bug. RTL: a condition that positions something by physical side is wrong in `fa`.

## Report

For each real finding: where, the input or state sequence that triggers it, what happens, and the smallest fix. If you checked a risky area and found it sound, say so in one line; do not pad.
