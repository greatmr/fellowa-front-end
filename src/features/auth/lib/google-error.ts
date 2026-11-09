/** What the entry screen says when a Google sign-in did not finish. */
export type GoogleErrorKind =
  'failed' | 'emailNotVerified' | 'usePassword' | 'alreadyLinked'

const KINDS: readonly GoogleErrorKind[] = [
  'failed',
  'emailNotVerified',
  'usePassword',
  'alreadyLinked',
]

/** `?googleError=` from the callback's redirect; anything else is ignored. */
export function googleErrorFrom(value: unknown): GoogleErrorKind | null {
  return KINDS.find((kind) => kind === value) ?? null
}
