import type { ApiError } from '@/lib/api/errors'
import type { UploadProblem } from '@/lib/api/upload-problem'

/** `posts.errors.*` keys, one per failure the panel explains. */
export type PostErrorKey =
  | 'generic'
  | 'sessionExpired'
  | 'notFound'
  | 'tierRequired'
  | 'tierNotFound'
  | 'paywallRequired'
  | 'imageNotFound'
  | 'mediaNotFound'
  | 'pollLocked'
  | 'network'

/** `USER_ALIAS_REQUIRED`: the caller has no page yet; a notice, not a line. */
export const NO_PAGE = 'USER_ALIAS_REQUIRED'

/** Codes from back-end `error-codes.ts` the content routes answer with. */
export function postErrorKey(error: ApiError): PostErrorKey {
  if (error.isNetworkError) return 'network'
  if (error.status === 401) return 'sessionExpired'
  switch (error.code) {
    case 'CONTENT_TIER_REQUIRED':
      return 'tierRequired'
    case 'TIER_NOT_FOUND':
      return 'tierNotFound'
    case 'CONTENT_PAYWALL_POSITION_REQUIRED':
      return 'paywallRequired'
    case 'CONTENT_IMAGE_NOT_FOUND':
      return 'imageNotFound'
    case 'CONTENT_VIDEO_NOT_FOUND':
    case 'CONTENT_AUDIO_NOT_FOUND':
      return 'mediaNotFound'
    case 'CONTENT_POLL_LOCKED':
      return 'pollLocked'
    case 'CONTENT_NOT_FOUND':
      return 'notFound'
  }
  return error.status === 404 ? 'notFound' : 'generic'
}

/**
 * `posts.composer.uploadErrors.*`: the upload failures worded the same for
 * every post field. `null` for the ones each field words itself (`size`,
 * `type`, `unavailable`, `failed`) and for `noPage`, which is a notice.
 */
export type SharedUploadLine =
  'sessionExpired' | 'storage' | 'requestRefused' | 'accountRefused'

export function sharedUploadLine(
  problem: UploadProblem | null
): SharedUploadLine | null {
  switch (problem) {
    case 'sessionExpired':
    case 'storage':
    case 'requestRefused':
    case 'accountRefused':
      return problem
    default:
      return null
  }
}
