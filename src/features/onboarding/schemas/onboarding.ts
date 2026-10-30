import { z } from 'zod'

import type {
  SocialField,
  SocialLinks,
} from '@/features/onboarding/types/onboarding'
import { FIRST_NAME_MAX, LAST_NAME_MAX } from '@/features/settings'
import { parseEnvelope } from '@/lib/api/envelope'
import { httpUrlOrNull } from '@/lib/url'

export class InvalidOnboardingResponseError extends Error {
  constructor() {
    super('Invalid onboarding response')
    this.name = 'InvalidOnboardingResponseError'
  }
}

/** The prototype's lower bound for a name; the upper bounds are the DTO's. */
export const FIRST_NAME_MIN = 2

export type NamesFormMessages = {
  firstNameLength: string
  lastNameLength: string
}

export function createNamesSchema(
  messages: NamesFormMessages = {
    firstNameLength: 'firstNameLength',
    lastNameLength: 'lastNameLength',
  }
) {
  return z.object({
    firstName: z
      .string()
      .trim()
      .min(FIRST_NAME_MIN, messages.firstNameLength)
      .max(FIRST_NAME_MAX, messages.firstNameLength),
    lastName: z.string().trim().max(LAST_NAME_MAX, messages.lastNameLength),
  })
}

// ---- Social links ----------------------------------------------------------

/**
 * The prototype's platforms that `UpdateAboutDto` has a field for, in its
 * order. Telegram and Aparat have none, so they are not offered.
 */
export const SOCIAL_PLATFORMS = [
  {
    field: 'instagramLink',
    key: 'instagram',
    hosts: ['instagram.com'],
    prefix: 'instagram.com/',
    base: 'https://www.instagram.com/',
  },
  {
    field: 'youtubeLink',
    key: 'youtube',
    hosts: ['youtube.com'],
    prefix: 'youtube.com/@',
    base: 'https://www.youtube.com/@',
  },
  {
    field: 'twitterLink',
    key: 'x',
    hosts: ['x.com', 'twitter.com'],
    prefix: 'x.com/',
    base: 'https://x.com/',
  },
] as const satisfies readonly {
  field: SocialField
  key: string
  hosts: readonly string[]
  prefix: string
  base: string
}[]

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

const HANDLE_PATTERN = /^[A-Za-z0-9._-]{2,100}$/

/**
 * The URL for what was typed: a handle, `@handle`, or a pasted address of this
 * platform. `null` when it is none of those, including an address on another
 * site, because the result is published as this platform's link.
 */
export function socialUrlFromInput(
  platform: SocialPlatform,
  input: string
): string | null {
  const address = input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(?:www\.|m\.)/i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
  const host = platform.hosts.find((name) =>
    address.toLowerCase().startsWith(`${name}/`)
  )
  const handle = (host ? address.slice(host.length + 1) : address).replace(
    /^@/,
    ''
  )
  return HANDLE_PATTERN.test(handle) ? `${platform.base}${handle}` : null
}

/** A stored link without its scheme, for a row the owner can recognize. */
export function displaySocialLink(url: string): string {
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
}

export const EMPTY_SOCIAL_LINKS: SocialLinks = {
  instagramLink: null,
  youtubeLink: null,
  twitterLink: null,
}

const socialLink = z
  .string()
  .max(2048)
  .refine((value) => httpUrlOrNull(value) !== null)
  .nullable()

/** What the server action accepts: all three fields, each a URL or `null`. */
export const socialLinksSchema = z.object({
  instagramLink: socialLink,
  youtubeLink: socialLink,
  twitterLink: socialLink,
})

// ---- Raw response (`GET /user/about`: the `AboutUser` entity) ---------------

const rawAboutSchema = z.object({
  instagramLink: z.string().nullish(),
  youtubeLink: z.string().nullish(),
  twitterLink: z.string().nullish(),
})

/** A stored value that is not an http(s) URL is not offered back for saving. */
function storedLink(value: string | null | undefined): string | null {
  return httpUrlOrNull(value) ? (value ?? null) : null
}

export function parseSocialLinks(value: unknown): SocialLinks {
  const raw = parseEnvelope(
    rawAboutSchema,
    value,
    () => new InvalidOnboardingResponseError()
  )
  return {
    instagramLink: storedLink(raw.instagramLink),
    youtubeLink: storedLink(raw.youtubeLink),
    twitterLink: storedLink(raw.twitterLink),
  }
}
