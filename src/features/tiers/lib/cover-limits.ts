/**
 * Tier cover size: the single source for the client check, the server action's
 * check and `next.config.ts`'s Server Action body limit (FE-TIER-02).
 * Imported by `next.config.ts`: no `@/` alias and no imports.
 */

const MB = 1024 * 1024

/**
 * The back-end's `IMAGE_UPLOAD.maxBytes` default, 10 MB (BE-CONT-08,
 * provisional; the server can change it with `UPLOAD_IMAGE_MAX_BYTES`, and a
 * larger file then still answers 413 `UPLOAD_TOO_LARGE`).
 */
export const MAX_TIER_COVER_BYTES = 10 * MB

/**
 * Next caps a Server Action request body at 1 MB by default, counting the
 * multipart boundaries and part headers (`serverActions.bodySizeLimit` docs:
 * 10–20 KB is typical). The cover limit plus 64 KB of room.
 */
export const SERVER_ACTION_BODY_LIMIT_BYTES = MAX_TIER_COVER_BYTES + 64 * 1024
