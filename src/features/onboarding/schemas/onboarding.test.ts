import { describe, expect, it } from 'vitest'

import {
  SOCIAL_PLATFORMS,
  displaySocialLink,
  parseSocialLinks,
  socialLinksSchema,
  socialUrlFromInput,
} from './onboarding'

const [instagram, youtube, x] = SOCIAL_PLATFORMS

describe('socialUrlFromInput', () => {
  it.each([
    ['studio', 'https://www.instagram.com/studio'],
    ['@studio', 'https://www.instagram.com/studio'],
    ['  studio.art_1 ', 'https://www.instagram.com/studio.art_1'],
    ['instagram.com/studio', 'https://www.instagram.com/studio'],
    ['https://www.instagram.com/studio/', 'https://www.instagram.com/studio'],
    [
      'https://instagram.com/studio?igsh=abc',
      'https://www.instagram.com/studio',
    ],
  ])('reads %s as an Instagram address', (input, url) => {
    expect(socialUrlFromInput(instagram, input)).toBe(url)
  })

  it('builds each platform on its own address', () => {
    expect(socialUrlFromInput(youtube, '@studio')).toBe(
      'https://www.youtube.com/@studio'
    )
    expect(socialUrlFromInput(youtube, 'https://youtube.com/@studio')).toBe(
      'https://www.youtube.com/@studio'
    )
    expect(socialUrlFromInput(x, 'https://twitter.com/studio')).toBe(
      'https://x.com/studio'
    )
  })

  it.each([
    ['empty', ''],
    ['one character', 'a'],
    ['Persian letters', 'استودیو'],
    ['Persian digits', '۱۲۳۴'],
    ['a space', 'my studio'],
    ['another site', 'https://evil.example/studio'],
    ['a deeper path', 'https://www.instagram.com/p/abc'],
    ['a script', 'javascript:alert(1)'],
  ])('refuses %s', (_name, input) => {
    expect(socialUrlFromInput(instagram, input)).toBeNull()
  })
})

describe('displaySocialLink', () => {
  it('drops the scheme, www and a trailing slash', () => {
    expect(displaySocialLink('https://www.instagram.com/studio/')).toBe(
      'instagram.com/studio'
    )
    expect(displaySocialLink('http://example.com/x')).toBe('example.com/x')
  })
})

describe('socialLinksSchema', () => {
  const none = { instagramLink: null, youtubeLink: null, twitterLink: null }

  it('accepts null and http(s) addresses, and drops unknown fields', () => {
    expect(
      socialLinksSchema.parse({
        ...none,
        instagramLink: 'https://www.instagram.com/studio',
        bio: 'not this flow',
      })
    ).toEqual({ ...none, instagramLink: 'https://www.instagram.com/studio' })
  })

  it.each(['javascript:alert(1)', 'studio', ''])('refuses %j', (value) => {
    expect(
      socialLinksSchema.safeParse({ ...none, twitterLink: value }).success
    ).toBe(false)
  })
})

describe('parseSocialLinks', () => {
  it('reads the links, leaves other fields behind and drops a non-URL', () => {
    expect(
      parseSocialLinks({
        data: {
          id: 3,
          bio: 'Hello',
          facebookLink: 'https://facebook.com/studio',
          instagramLink: 'https://instagram.com/studio',
          twitterLink: 'javascript:alert(1)',
          youtubeLink: null,
        },
        errors: null,
      })
    ).toEqual({
      instagramLink: 'https://instagram.com/studio',
      youtubeLink: null,
      twitterLink: null,
    })
  })
})
