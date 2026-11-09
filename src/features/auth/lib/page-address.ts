import { ALIAS_MAX_LENGTH, ALIAS_MIN_LENGTH } from '@/features/auth/schemas'
import type { AliasAvailability } from '@/features/auth/types'

/**
 * The page address step (presentation `OnboardingUrlScreen` @ fdb5f6c), under
 * the backend's alias rules (`alias-rules.ts`: 3–30 of `A-Z a-z 0-9 _`, stored
 * lowercased). The prototype also allowed `.`; the API does not (open
 * question in BE-AUTH-09).
 */

/** Anything the API refuses, dropped as it is typed. */
const DISALLOWED = /[^A-Za-z0-9_]/g

/**
 * What the field keeps of `raw`, and whether something visible was dropped
 * (so the field can say which characters it takes). Non-ASCII is dropped
 * before lowercasing: some characters lowercase to ASCII (the Kelvin sign).
 */
export function cleanAddressInput(raw: string) {
  const value = raw
    .replace(DISALLOWED, '')
    .toLowerCase()
    .slice(0, ALIAS_MAX_LENGTH)
  const dropped = /\S/.test(raw.replace(/[A-Za-z0-9_]/g, ''))
  return { value, dropped }
}

/**
 * A first address from a Latin page name, as the prototype prefills it; empty
 * for a Persian name or one too short to be an address.
 */
export function addressFromName(name: string): string {
  if (/[؀-ۿ]/.test(name)) return ''
  const { value } = cleanAddressInput(name)
  return value.length >= ALIAS_MIN_LENGTH ? value : ''
}

/**
 * What the field shows. `checking` while the live check (BE-AUTH-09) runs;
 * `unchecked` when the format is valid and the check could not answer (a 429,
 * a network error): it may still be saved, and the save's 409 has the last
 * word. `taken` also comes from that 409.
 */
export type AddressStatus =
  | 'idle'
  | 'tooShort'
  | 'invalid'
  | 'checking'
  | 'unchecked'
  | 'available'
  | 'taken'
  | 'reserved'

/** The status from the format alone. */
export function addressFormatStatus(
  value: string
): Extract<AddressStatus, 'idle' | 'tooShort' | 'unchecked'> {
  if (!value) return 'idle'
  return value.length < ALIAS_MIN_LENGTH ? 'tooShort' : 'unchecked'
}

const REASON_STATUS = {
  too_short: 'tooShort',
  invalid: 'invalid',
  reserved: 'reserved',
  taken: 'taken',
} as const satisfies Record<
  NonNullable<AliasAvailability['reason']>,
  AddressStatus
>

/**
 * Format first (no request for an address that cannot be valid), then a 409
 * from saving this very address, then the live answer for it.
 */
export function addressStatus({
  value,
  settled,
  checking,
  answer,
  takenOnSave,
}: {
  value: string
  /** The debounce has caught up with `value`. */
  settled: boolean
  checking: boolean
  answer: AliasAvailability | undefined
  takenOnSave: string | null
}): AddressStatus {
  const format = addressFormatStatus(value)
  if (format !== 'unchecked') return format
  if (takenOnSave === value) return 'taken'
  if (!settled || checking) return 'checking'
  if (!answer || answer.alias !== value) return 'unchecked'
  return answer.available || answer.reason === null
    ? 'available'
    : REASON_STATUS[answer.reason]
}

/** Whether the address may be saved in this status. */
export function canSaveAddress(status: AddressStatus) {
  return status === 'unchecked' || status === 'available'
}
