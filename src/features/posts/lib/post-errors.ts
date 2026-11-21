import type { ApiError } from '@/lib/api/errors'

/** `posts.errors.*` keys, one per failure the studio explains. */
export type PostErrorKey =
  | 'generic'
  | 'sessionExpired'
  | 'notFound'
  | 'tierRequired'
  | 'tierNotFound'
  | 'paywallRequired'
  | 'imageNotFound'
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
    case 'CONTENT_NOT_FOUND':
      return 'notFound'
  }
  return error.status === 404 ? 'notFound' : 'generic'
}
