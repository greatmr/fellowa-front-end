/**
 * One post as its reader may see it (FE-CONT-01), from `GET /landing/posts/:id`
 * (anonymous) or `GET /content/:id` (signed in). The backend decides `access`
 * per viewer and sends only what that level permits (Q-09, Q-51, ADR-0003);
 * each variant below holds only the keys that level carries, so nothing gated
 * can be passed on even if a response held more.
 *
 * DENY never arrives as a body: both routes answer 404, and the reader shows
 * "not found".
 */
export type ReaderPost = FullReaderPost | PartialReaderPost | TeaserReaderPost

type ReaderPostBase = {
  id: number
  /**
   * The account that owns the post's page, the id `/creators/:id` takes
   * (BE-CONT-13). Said at every level: whose post it is is not gated.
   */
  creatorId: number
  /** What the post holds (`text`, `image`, `video`, …); said at every level. */
  type: string
  title: string
  createdAt: string
}

export type ReaderFile = { id: number; url: string | null }

export type FullReaderPost = ReaderPostBase & {
  access: 'FULL'
  text: string | null
  images: ReaderFile[]
  attachments: ReaderFile[]
  links: { id: number; url: string | null }[]
  /** No playable URL is in the contract; only how many there are. */
  videoCount: number
  /** As for videos; `ready` is `audios[].status`. */
  audios: { id: number; ready: boolean }[]
  /** Only `GET /content/:id` sends polls; landing never does (Q-57). */
  poll: { id: number; options: { id: number; label: string }[] } | null
}

export type PartialReaderPost = ReaderPostBase & {
  access: 'PARTIAL'
  /** The body up to the paywall, cut on the server; `null` at position 0. */
  text: string | null
}

export type TeaserReaderPost = ReaderPostBase & {
  access: 'TEASER'
  /** What the owner typed as a preview, never made from the body. */
  textPreview: string | null
}

/** Which endpoint answered: the signed-in read, or the anonymous one. */
export type ReaderViewer = 'anonymous' | 'signedIn'
