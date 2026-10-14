---
paths:
  - "test/**"
  - "**/*.test.{ts,tsx}"
  - "**/*.spec.{ts,tsx}"
---

# Tests (Vitest + Testing Library + MSW)

- Setup: `vitest.config.mts` (jsdom, globals, `./test/setup.ts`). The setup file registers `@testing-library/jest-dom`, starts the MSW server with `onUnhandledRequest: "error"`, and cleans up after each test. An unhandled request fails the test on purpose — add a handler, never relax the option.
- Tests live beside what they test (`src/features/<feature>/**/*.test.tsx`) or under `test/` for cross-cutting ones. The baseline is in `.claude/CLAUDE.md`: compare against it before claiming a pass or a regression.
- **Mock at the network boundary** with MSW: add or extend handlers in `test/msw/handlers.ts`, or override per test with `server.use(...)`. Do not mock `axios`, `apiClient`, or a request hook — mocking the layer you are testing proves nothing. Fixtures must match the real backend response shape; a fixture is a claim about the contract, and a wrong one makes the test certify the wrong behavior.
- Include the fixtures that break UI: empty list, error status, network failure, **`TEASER` and `DENY` access levels**, membership pending payment, expired membership, viewer is the creator, amount of zero.
- Query by role, label or text before `data-testid`. Assert what the user can observe, not that a function was called. For a gated view, assert that the locked state renders **and** that the gated text is absent from the document — a test that only checks the lock icon would pass while the body leaks.
- A component under test that uses TanStack Query needs a fresh `QueryClient` per test (no retries, no shared cache); one that uses next-intl needs `NextIntlClientProvider` with real messages. Build a small render helper in `test/` rather than repeating the wrappers.
- Server components and `proxy.ts` are not covered by jsdom. Test the pure logic they call, and say in the report what was not exercised. Do not fake a server component to make it renderable.
- Fake the clock for anything time-dependent (membership expiry, countdowns, payment timeouts). Assert money as amount **and** unit.
- Add or extend a test when the area already has coverage, or when a logic-heavy fix is cheap to pin and at least one assertion fails without the change. Otherwise state "no test added: <reason>" in the report. Don't generate snapshot tests wholesale.
