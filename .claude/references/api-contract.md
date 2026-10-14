# The backend contract: where it lives and how to read it

The API is `../back-end` — NestJS 11 + TypeORM + PostgreSQL, with Bull/Redis queues, Socket.IO, Zarinpal (SOAP) for payments and Arvan Cloud / S3 for storage. Auth is `passport-jwt` bearer tokens.

**Nothing in this file substitutes for reading the code.** It tells you where to look and what traps are there.

## Order of evidence (always this order)

1. **`../back-end/docs/modules/<module>/api.md`** — the documented surface per module. There are 11 modules; `ls ../back-end/docs/modules` lists them.
2. **The controller** — `rg -n "<path fragment>" ../back-end/src --glob '*.controller.ts'` gives the route, method, guards and query params that actually exist.
3. **The DTO** — the request shape and its validation decorators. A field without a decorator is not validated; a field absent from the DTO is dropped.
4. **The service and the entity** — what is actually selected and returned. A controller returning an entity returns *the whole entity* unless a DTO or `select` narrows it.
5. **`../back-end/docs/modules/<module>/README.md`** and `../back-end/docs/architecture/*` for intent and the gap analysis.

Where the docs and the code disagree, **the code is what your UI will meet today**. Record the disagreement as a fact plus an open question; never resolve it silently in either direction.

## Traps that have already caused work

- **Legacy names in responses.** `Tire` = Tier. `BuyTire` = membership purchase. `ChatLine` = chat. `CreatorBill` = payout. `aboutUser_Payment` exists. Map them to product language at the API boundary — one mapping function per resource — and keep legacy names out of UI code and copy.
- **No migrations, `synchronize: true`.** The live schema is the legacy one, not the target in `../docs/database-updated-schema.pdf`. A field that exists only in the target schema does not exist for you yet. Check the entity, not the schema document.
- **Integer primary keys, mostly bare integer foreign keys** with no constraints, and soft delete nearly everywhere. A list may contain soft-deleted rows if the query did not exclude them; if a response looks like it has ghosts, that is why — report it rather than filtering client-side.
- **Over-returning endpoints.** At least one endpoint returns a full account entity (including the password hash and the verification code) to anonymous callers. Treat every response as potentially wider than the view needs: type only the fields you use, never spread a response into a component's props, and report the over-return as a backend defect.
- **Content access control is not implemented yet.** Do not assume a response is already gated. If a story needs gating that the backend does not yet apply, that is a backend dependency and a BLOCKING question, not something the client can compensate for.
- **Payment amount defects.** Amount handling in the gateway path has known bugs. Never send an amount from the client, and never trust a gateway return as proof of payment.
- **Throttling is configured but not bound** on every route, so client-side retry loops can hammer the API. The query client already refuses to retry 4xx; do not add your own retry loop.

## Shapes

- **Errors.** `toApiError` in `src/lib/api/errors.ts` parses the **NestJS default** exception body (`{ statusCode, message, error }`, `message` a string or `string[]` from class-validator). If the backend has a custom exception filter, confirm the real shape and update that one file — not each call site.
- **Envelopes.** Do not assume a `{ data, meta }` envelope. Check the controller; some endpoints return the resource directly. Whatever it is, type it once per endpoint.
- **Pagination.** Confirm the parameter names per module (`page`/`limit` vs `skip`/`take` vs a cursor) before writing a list query — they are not uniform.
- **Query parameters that change meaning**, above all `?context=page|memberships`, belong in the TanStack Query key. Two meanings behind one cache entry is a correctness bug, not a performance detail.

## Writing a request in this project

Request functions and hooks live in `src/features/<feature>/api/`; the axios instance, helpers and error normalization in `src/lib/api/`. The full procedure, with the required shapes, is the skill `api-integration`. The short version: contract → types → request function → query/mutation hook → component, in that order, and no step invents a field.
