import 'server-only'

/** Server-side surface other features may use (session + origin check). */
export {
  readOptionalSessionToken,
  readSession,
  type AuthSession,
} from '@/features/auth/server/session'
export { reusableDisplayName } from '@/features/auth/schemas'
export { validAuthRequestOrigin } from '@/features/auth/server/request-security'
export {
  authorizedViewerSession,
  authorizedViewerToken,
} from '@/features/auth/server/viewer-token'
