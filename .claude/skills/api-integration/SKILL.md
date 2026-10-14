---
name: api-integration
description: Project pattern for backend integration in the Fellowa frontend - contract first, then API types, the request function, the useQuery / useMutation hook with its query-key factory, then the component - with the query-client defaults, error normalization, cache-key and invalidation rules, and the money and gated-content constraints. Use when adding or changing an endpoint call, query, mutation, response type or request payload, or when data looks stale or an API call is duplicated.
---

Flow: **contract → types → request function → hook → component**. Work in that order. Skipping step 1 is how a frontend ends up asserting a field the backend never sends.

## 1. Contract first

Never type from a guess, from a story, or from a design package. Establish the real shape from, in order: `../back-end/docs/modules/<module>/api.md`, then the **controller**, the **DTO**, the **service** and the **entity** in `../back-end/src`. Where the docs and the code disagree, the code is what you will meet; record the disagreement. Traps (legacy `Tire`/`BuyTire` names, over-returning endpoints, non-uniform pagination, no envelope guarantee) are catalogued in `.claude/references/api-contract.md`.

A field you could not verify is **optional** and listed in your report. Never invent a field, an endpoint, a query parameter or an enum value.

## 2. Types (`src/features/<feature>/types/`)

- One file per resource. Keep three shapes apart where they differ: the **request payload**, the **raw response** as the backend sends it, and the **model** the UI uses.
- Map legacy names at this boundary (`Tire` → `Tier`, `BuyTire` → `MembershipPurchase`) in one mapping function per resource. `Tire` must not appear beyond this file.
- Type only the fields the UI uses. Do not mirror a whole entity, and never spread a response into component props — an over-returning endpoint will hand you a password hash.
- Where the response is untrusted or loosely shaped, parse it with a zod schema in `schemas/` and let the TypeScript type be `z.infer` of it, so the two cannot drift.

## 3. Request function + hook (`src/features/<feature>/api/`)

```ts
// src/features/<feature>/api/get-page.ts
import { apiGet } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import type { PageResponse } from "../types/page";

export const pageKeys = {
  all: ["page"] as const,
  detail: (handle: string, context: "page" | "memberships") =>
    [...pageKeys.all, "detail", handle, context] as const,
};

export function getPage(handle: string, context: "page" | "memberships") {
  return apiGet<PageResponse>(`/pages/${handle}`, { params: { context } });
}

export function usePageQuery(
  handle: string,
  context: "page" | "memberships",
) {
  return useQuery({
    queryKey: pageKeys.detail(handle, context),
    queryFn: () => getPage(handle, context),
    enabled: Boolean(handle),
  });
}
```

```ts
// src/features/<feature>/api/subscribe.ts
import { apiPost } from "@/lib/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSubscribeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubscribePayload) =>
      apiPost<SubscribeResponse, SubscribePayload>("/memberships", input),
    onSuccess: (_data, input) => {
      // Membership changed, so every view whose access level depends on it is
      // now wrong. Invalidate rather than patching the cache by hand.
      queryClient.invalidateQueries({ queryKey: pageKeys.all });
    },
  });
}
```

Rules this shape encodes:

- **Only `apiClient` / `apiGet` / `apiPost` / …** from `@/lib/api/client`. Never import `axios` in feature code — you would lose the base URL, the auth header and error normalization.
- **A key factory per feature**, co-located with its requests. Every input that changes the result is in the key — including `?context=page|memberships` and the identity of the viewed resource. Two keys for the same data is a bug; one key for data that varies by input is a worse bug.
- **Errors are already `ApiError`** by the time you see them (the response interceptor runs `toApiError`). Branch on `status` / `isUnauthorized` / `isNetworkError`, not on a string match.
- A mutation that changes membership, payment status or anything gated **invalidates**; it does not hand-patch the cache. A stale `TEASER` after a successful purchase is the failure mode this prevents.

## 4. Query-client behavior you must design around (`src/lib/api/query-client.ts`)

- Defaults: `staleTime` 30 s, `gcTime` 5 min, no refetch on window focus, **no retry on any 4xx**, mutations never retry. One client per request on the server, one shared client in the browser.
- 30 s is a compromise, not a blessing. Shorten it (or set `staleTime: 0`) for an access level, a payment status or anything the user expects to change after their own action. Lengthen it only for data that genuinely is stable, and say why.
- There are **no global toasts** on queries or mutations. Render your own error state from `isError` / `error`, and raise a `sonner` toast deliberately where a toast is the right affordance. Do not build a global interceptor that toasts — it fires in contexts that should render inline.
- A per-viewer response must never be cached where another viewer can read it: no static rendering or `"use cache"` on a viewer-dependent route.

## 5. Component

Fetch in a server component where you can. Use a hook when the data is driven by client interaction (a filter, an infinite list, an optimistic action). Components stay thin: props in, events out, and loading / empty / error / **locked** rendered explicitly. A response is not component state — never copy it into `useState` or a store.

## 6. Money, time, identity

- Chargeable amounts are integer **Toman**, resolved by the backend. Format through one shared helper with the unit attached; never compute, scale, round or sum one, and never send a client-derived amount. A membership shows its **price snapshot**, not the tier's current price.
- Dates are `timestamptz`; Jalali is display-only. Never store, send or compare a Jalali string.
- The access token reaches the instance through the single provider registered with `setAccessTokenProvider`. Never read or write a token elsewhere, and never put one in a query key, a URL, persisted state or a log.

## 7. Tests and checklist

Add an MSW handler in `test/msw/handlers.ts` (or `server.use` per test) with a fixture shaped like the real response, including the `TEASER` / `DENY` / pending-payment cases (rule `.claude/rules/testing.md`).

- [ ] Types match the real controller/DTO/entity; no `any`; legacy names mapped at the boundary; no field invented.
- [ ] Only fields the UI uses are typed; no response spread into props.
- [ ] Key factory co-located; every input in the key, `context` included; no duplicate key for the same data.
- [ ] Staleness decided deliberately; mutations that change access or payment invalidate.
- [ ] Error, empty and locked states rendered; no global toast added.
- [ ] No client-computed chargeable amount; unit always attached.
- [ ] `npm run typecheck`, `npm run lint`, `npm run test` clean for your change.
