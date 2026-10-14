# features/

One directory per product capability. A feature owns everything it needs and
exposes only what other features consume.

```
features/<feature>/
  api/            request functions + the useQuery / useMutation hooks that wrap them
  components/     components for this feature only
  hooks/          feature-specific hooks (not request hooks — those live in api/)
  schemas/        zod schemas for forms and for parsing untrusted input
  types/          types for this feature; API types come from the real contract
  index.ts        the feature's public surface
```

Rules:

- Routes in `src/app/[locale]/**` stay thin: they read params, fetch, and render
  a feature component. Business logic never lives in a route file.
- A feature imports another feature only through its `index.ts`. If two features
  need the same thing, move it to `src/components`, `src/lib` or `src/hooks` —
  do not add a cross-feature deep import.
- Do not create a feature directory before there is a story to build in it.
