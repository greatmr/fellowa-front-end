import type { ApiError } from '@/lib/api/errors'

/**
 * Why a file upload through a Server Action failed, one value per answer the
 * upload routes give (FE-TIER-04, FE-POST-05). Each feature words its own
 * line; this is the one table from error to meaning.
 *
 * - `noPage`: `USER_ALIAS_REQUIRED`, the caller has no page yet (a notice).
 * - `sessionExpired`: 401 (a toast or a sign-in line).
 * - `size` / `type`: 413 / 415 (`UPLOAD_TOO_LARGE`, `PAYLOAD_TOO_LARGE`,
 *   `UPLOAD_TYPE_NOT_ALLOWED`).
 * - `unavailable`: 503 `INTEGRATION_NOT_CONFIGURED`, the server has no object
 *   storage or no Arvan key. Retrying does not help.
 * - `storage`: 500, the storage call failed (`S3 upload failed`, `Arvan …
 *   failed`). Retrying may help.
 * - `requestRefused`: 403 `INVALID_REQUEST` from the action's Origin check.
 * - `accountRefused`: any other 403: another account's tab, or an unverified
 *   account (`authorizedToken` in the feature's `server/actions.ts`).
 * - `failed`: anything else, a network failure included.
 */
export type UploadProblem =
  | 'noPage'
  | 'sessionExpired'
  | 'size'
  | 'type'
  | 'unavailable'
  | 'storage'
  | 'requestRefused'
  | 'accountRefused'
  | 'failed'

const NO_PAGE = 'USER_ALIAS_REQUIRED'
/** 503 from `StorageService` / `ArvanService` (`integrationNotConfigured`). */
const NOT_CONFIGURED = 'INTEGRATION_NOT_CONFIGURED'
/** 403 from the action's Origin check (`mutation` in `server/actions.ts`). */
const REQUEST_REFUSED = 'INVALID_REQUEST'

export function uploadProblem(error: ApiError): UploadProblem {
  if (error.code === NO_PAGE) return 'noPage'
  if (error.status === 401) return 'sessionExpired'
  if (error.status === 413) return 'size'
  if (error.status === 415) return 'type'
  if (error.status === 503 && error.code === NOT_CONFIGURED) {
    return 'unavailable'
  }
  if (error.status === 500) return 'storage'
  if (error.status === 403) {
    return error.code === REQUEST_REFUSED ? 'requestRefused' : 'accountRefused'
  }
  return 'failed'
}
