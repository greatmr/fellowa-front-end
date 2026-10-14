import type { RequestHandler } from "msw";

/**
 * Default request handlers.
 *
 * Add a handler per endpoint as the feature that calls it is built, with
 * fixtures shaped like the real backend response — including the cases that
 * break UI: empty, error, gated (TEASER / DENY), payment pending.
 *
 * Never invent a response shape here. A fixture is a claim about the contract,
 * and a wrong one makes the tests certify the wrong thing.
 */
export const handlers: RequestHandler[] = [];
