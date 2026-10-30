'use server'

import { z } from 'zod'

import { authorizedViewerToken } from '@/features/auth/server'
import {
  changePassword,
  updatePersonal,
} from '@/features/settings/api/settings-api'
import {
  FIRST_NAME_MAX,
  LAST_NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  normalizeMobile,
} from '@/features/settings/schemas/settings'
import type {
  ChangePasswordPayload,
  PersonalDetails,
} from '@/features/settings/types/settings'
import { runApiAction, type ApiActionResult } from '@/lib/api/action-result'

// The form validates for the user; these re-check what reaches the API.
const personalSchema = z.object({
  firstName: z.string().trim().max(FIRST_NAME_MAX),
  lastName: z.string().trim().max(LAST_NAME_MAX),
  phoneNumber: z
    .string()
    .transform(normalizeMobile)
    .refine((v) => v === '' || /^09\d{9}$/.test(v)),
})
const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX),
  newPassword: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
})

/** Settings mutations (FE-SET-01) act only on the signed-in account. */
export async function updatePersonalAction(
  viewerId: number,
  input: PersonalDetails
): Promise<ApiActionResult<PersonalDetails>> {
  const parsed = personalSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, status: 400, code: 'INVALID_REQUEST' }
  const token = await authorizedViewerToken(viewerId)
  if (!token.ok) return token
  return runApiAction(async () => {
    await updatePersonal(token.data, parsed.data)
    return parsed.data
  })
}

export async function changePasswordAction(
  viewerId: number,
  input: ChangePasswordPayload
): Promise<ApiActionResult<null>> {
  const parsed = passwordSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, status: 400, code: 'INVALID_REQUEST' }
  const token = await authorizedViewerToken(viewerId)
  if (!token.ok) return token
  return runApiAction(async () => {
    await changePassword(token.data, parsed.data)
    return null
  })
}
