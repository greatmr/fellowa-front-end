import 'server-only'

import { z } from 'zod'

import type { AuthUser } from '@/features/auth/types'
import { apiGet, apiPost, apiPut } from '@/lib/api/client'

export class InvalidAuthResponseError extends Error {
  constructor() {
    super('Invalid authentication response')
    this.name = 'InvalidAuthResponseError'
  }
}

const userSchema = z.object({
  id: z.number().int().positive().safe(),
  email: z.string().email(),
  alias: z.string().nullable(),
  isVerified: z.boolean(),
})

const credentialsResponseSchema = z.object({
  data: z.object({ token: z.string().min(1) }),
  errors: z.null(),
})

const profileResponseSchema = z.object({ data: userSchema, errors: z.null() })
const mutationResponseSchema = z.object({
  data: z.object({ message: z.string() }),
  errors: z.null(),
})

function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new InvalidAuthResponseError()
  return parsed.data
}

export async function submitCredentials(
  mode: 'login' | 'register',
  credentials: { email: string; password: string }
): Promise<string> {
  const response = await apiPost<unknown>(`/auth/${mode}`, credentials)
  return parseResponse(credentialsResponseSchema, response).data.token
}

export async function fetchOwnProfile(
  token: string,
  userId: number
): Promise<AuthUser> {
  const response = await apiGet<unknown>(`/user/${userId}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const user = parseResponse(profileResponseSchema, response).data
  if (user.id !== userId) throw new InvalidAuthResponseError()
  return user
}

export async function verifyEmailCode(token: string, code: string) {
  const response = await apiPut<unknown>(
    '/auth/verify-code',
    { code },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  parseResponse(mutationResponseSchema, response)
}

export async function resendEmailCode(token: string) {
  const response = await apiPut<unknown>('/auth/resend-code', undefined, {
    headers: { Authorization: `Bearer ${token}` },
  })
  parseResponse(mutationResponseSchema, response)
}
