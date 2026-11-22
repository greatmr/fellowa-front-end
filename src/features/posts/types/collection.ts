/**
 * The owner's collections (BE-CONT-15, FQ-35: many-to-many, unordered;
 * deleting one keeps its posts). `OwnerCollection` as `GET/POST/PUT
 * /content/collections` send it; only the keys the panel reads.
 */
export type OwnerCollection = {
  id: number
  title: string
  description: string | null
  /** The owner's live posts in it, drafts included. */
  postCount: number
}

/** `POST /content/collections`. */
export type CreateCollectionInput = {
  title: string
  description: string | null
  /** The exact post set (≤ 500), drafts allowed. */
  postIds?: number[]
}

/** `PUT /content/collections/:id`: a key left out is unchanged. */
export type UpdateCollectionInput = {
  collectionId: number
  title?: string
  /** `null` clears it. */
  description?: string | null
  /** Sent, it replaces the set (`[]` empties it). */
  postIds?: number[]
}

/** `PUT /content/:id/collections`: the post's collections, exactly. */
export type SetPostCollectionsInput = {
  postId: number
  collectionIds: number[]
}

/** `POST /content/collections/assign`: every post into every collection. */
export type AssignCollectionsInput = {
  postIds: number[]
  collectionIds: number[]
}

/** One post's collections after a write, ascending. */
export type PostCollections = { postId: number; collectionIds: number[] }
