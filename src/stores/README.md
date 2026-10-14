# stores/

Zustand stores, for **client state that is shared across routes** — a composer
draft, a filter panel's open state, an onboarding step.

Not for:

- **Server data.** That belongs in TanStack Query, keyed so it invalidates. A
  store holding a copy of a response is a second source of truth that will
  disagree with the cache.
- **Component-local state.** `useState` in the component that owns it.
- **Anything derived.** Compute it where it is read.

Shape: one file per store, `useXStore`, a `State` type and an explicit reset.
Persist to storage only deliberately, and never persist access tokens or any
value that depends on who is signed in.
