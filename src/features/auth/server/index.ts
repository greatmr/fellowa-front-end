import 'server-only'

/** Server-side surface other features may use (session + origin check). */
export { readSession, type AuthSession } from '@/features/auth/server/session'
export { validAuthRequestOrigin } from '@/features/auth/server/request-security'
