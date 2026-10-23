import 'server-only'

import { cookies } from 'next/headers'
import { connection } from 'next/server'
import { cache } from 'react'
import { z } from 'zod'

import {
  fetchOwnProfile,
  InvalidAuthResponseError,
} from '@/features/auth/api/auth-api'
import type { AuthUser } from '@/features/auth/types'
import { ApiError } from '@/lib/api/errors'
import { env } from '@/lib/env'

export const sessionCookieName = 'fellowa_session'
const maximumSessionSeconds = 24 * 60 * 60

export type AuthSession = {
  token: string
  user: AuthUser
  expiresAt: Date
}

const claimsSchema = z.object({
  sub: z.number().int().positive().safe(),
  exp: z.number().int().positive().safe(),
})

/** Routing/expiry hints only. The backend validates signature and identity. */
function readTokenHints(token: string) {
  if (
    token.length > 4000 ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
  ) {
    return null
  }
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const claims = claimsSchema.safeParse(
      JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    )
    if (!claims.success) return null
    const expiresAt = new Date(claims.data.exp * 1000)
    if (
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      return null
    }
    return { userId: claims.data.sub, expiresAt }
  } catch {
    return null
  }
}

export function isRejectedSession(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 || error.status === 403 || error.status === 404)
  )
}

export async function authenticateToken(token: string): Promise<AuthSession> {
  // JWT expiry must use a live request clock, including token checks reached
  // during Partial Prefetching. Never evaluate it in a prerendered shell.
  await connection()
  const hints = readTokenHints(token)
  if (!hints) throw new InvalidAuthResponseError()
  const user = await fetchOwnProfile(token, hints.userId)
  // Validation might have crossed the token's expiry while the API was pending.
  if (hints.expiresAt.getTime() <= Date.now()) {
    throw new InvalidAuthResponseError()
  }
  return { token, user, expiresAt: hints.expiresAt }
}

/** Fresh read for actions. Never retain identity in module-level state. */
export async function readSession(): Promise<AuthSession | null> {
  await connection()
  const token = (await cookies()).get(sessionCookieName)?.value
  if (!token || !readTokenHints(token)) return null
  try {
    return await authenticateToken(token)
  } catch (error) {
    if (isRejectedSession(error) || !readTokenHints(token)) return null
    throw error
  }
}

// React.cache deduplicates only within an RSC request; no persistent data cache.
export const getSession = cache(readSession)

export async function saveSession(session: AuthSession): Promise<void> {
  const cookieStore = await cookies()
  const maxAge = Math.min(
    maximumSessionSeconds,
    Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
  )
  if (maxAge <= 0) throw new InvalidAuthResponseError()
  cookieStore.set(sessionCookieName, session.token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(Date.now() + maxAge * 1000),
    maxAge,
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(sessionCookieName, '', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  })
}
