import { z } from 'zod'

import type { PersonalDetails } from '@/features/settings/types/settings'
import { parseEnvelope } from '@/lib/api/envelope'
import { toLatinDigits } from '@/lib/digits'

/** Backend limits (`UpdatePersonalDto`, `ResetPasswordDto`). */
export const FIRST_NAME_MAX = 60
export const LAST_NAME_MAX = 100
export const PASSWORD_MIN = 8
/** The action refuses longer input; the form says so first. */
export const PASSWORD_MAX = 200

export class InvalidSettingsResponseError extends Error {
  constructor() {
    super('Invalid settings response')
    this.name = 'InvalidSettingsResponseError'
  }
}

/** An Iranian mobile number as the prototype validates it: 09 + 9 digits. */
export function normalizeMobile(value: string): string {
  return toLatinDigits(value).replace(/[\s-]/g, '')
}

export type PersonalFormMessages = {
  firstNameLength: string
  lastNameLength: string
  phone: string
}

export function createPersonalSchema(messages: PersonalFormMessages) {
  return z.object({
    firstName: z.string().trim().max(FIRST_NAME_MAX, messages.firstNameLength),
    lastName: z.string().trim().max(LAST_NAME_MAX, messages.lastNameLength),
    phoneNumber: z
      .string()
      .transform(normalizeMobile)
      .refine((v) => v === '' || /^09\d{9}$/.test(v), messages.phone),
  })
}

export type PasswordFormMessages = {
  currentRequired: string
  newLength: string
  tooLong: string
  mismatch: string
}

export function createPasswordSchema(messages: PasswordFormMessages) {
  return z
    .object({
      currentPassword: z
        .string()
        .min(1, messages.currentRequired)
        .max(PASSWORD_MAX, messages.tooLong),
      newPassword: z
        .string()
        .min(PASSWORD_MIN, messages.newLength)
        .max(PASSWORD_MAX, messages.tooLong),
      confirmPassword: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
      path: ['confirmPassword'],
      message: messages.mismatch,
    })
}

// ---- Raw response (`GET /user/personal`: the `UserPersonal` entity) --------

const rawPersonalSchema = z.object({
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  phoneNumber: z.string().nullish(),
})

export function parsePersonal(value: unknown): PersonalDetails {
  const raw = parseEnvelope(
    rawPersonalSchema,
    value,
    () => new InvalidSettingsResponseError()
  )
  return {
    firstName: raw.firstName ?? '',
    lastName: raw.lastName ?? '',
    phoneNumber: raw.phoneNumber ?? '',
  }
}

export const EMPTY_PERSONAL: PersonalDetails = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
}
