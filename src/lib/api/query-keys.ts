/**
 * Query-key registry.
 *
 * Every key for a feature lives in that feature's own factory, and every input
 * that changes the result is part of the key. Two different keys for the same
 * data is a bug (two network calls, two caches that can disagree); so is one
 * key for data that varies by input (the wrong user's data served from cache).
 *
 * Fellowa specifics worth stating once:
 * - A page view and a memberships view of the same resource are DIFFERENT
 *   data: the `?context=page|memberships` value belongs in the key.
 * - Anything whose response depends on the viewer's access level to gated
 *   content must include the identity of the resource being viewed, so a
 *   change in membership invalidates it rather than serving a stale TEASER.
 *
 * Add a factory here as the feature that needs it is built. Do not pre-create
 * keys for endpoints that do not exist yet.
 */
export const queryKeys = {
  all: ["fellowa"] as const,
} as const;

export type QueryKey = readonly unknown[];
