import { z } from 'zod'

import type {
  PageNameState,
  PersonalDetails,
} from '@/features/settings/types/settings'
import { parseEnvelope } from '@/lib/api/envelope'
import { toLatinDigits } from '@/lib/digits'

/**
 * Backend limits (`UpdatePersonalDto`, `ResetPasswordDto`; `CompleteAccountDto`
 * has the same password minimum, kept at 8 by FQ-17).
 */
export const FIRST_NAME_MAX = 60
export const LAST_NAME_MAX = 100
export const PASSWORD_MIN = 8
/** The action refuses longer input; the form says so first. */
export const PASSWORD_MAX = 200

/** `UpdateAboutDto.pageName` (BE-USER-07): 2–80 characters once trimmed. */
export const PAGE_NAME_MIN = 2
export const PAGE_NAME_MAX = 80

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

export type FirstPasswordFormMessages = {
  newLength: string
  tooLong: string
  mismatch: string
}

/** A first password (FE-AUTH-05): new and repeat, no current password. */
export function createFirstPasswordSchema(messages: FirstPasswordFormMessages) {
  return z
    .object({
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

// ---- Public page name (BE-USER-07, FQ-17) ---------------------------------

/** As the backend stores it: trimmed, and a blank name clears it (`null`). */
export function normalizePageName(value: string | null): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

/**
 * `null` (clear) or 2–80 characters. Counted per character, as the backend's
 * `MinLength`/`MaxLength` and the `varchar(80)` column count, not per UTF-16
 * unit.
 */
export function isValidPageName(value: string | null): boolean {
  if (value === null) return true
  const length = Array.from(value).length
  return length >= PAGE_NAME_MIN && length <= PAGE_NAME_MAX
}

export function createPageNameSchema(messages: { length: string }) {
  return z.object({
    pageName: z
      .string()
      .refine((v) => isValidPageName(normalizePageName(v)), messages.length),
  })
}

/** What the server action accepts: a name, or `null`/blank to clear it. */
export const pageNamePayloadSchema = z
  .string()
  .max(1000)
  .nullable()
  .transform(normalizePageName)
  .refine(isValidPageName)

// Raw response (`GET /user/about`: `AboutInfo`; `id` is the page id, `null`
// with no page). Only the two fields this form reads.
const rawAboutSchema = z.object({
  id: z.number().int().positive().nullable(),
  pageName: z.string().nullish(),
})

export function parsePageNameState(value: unknown): PageNameState {
  const raw = parseEnvelope(
    rawAboutSchema,
    value,
    () => new InvalidSettingsResponseError()
  )
  return {
    hasPage: raw.id !== null,
    pageName: raw.id === null ? null : normalizePageName(raw.pageName ?? null),
  }
}
