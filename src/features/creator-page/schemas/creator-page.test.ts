import { describe, expect, it } from 'vitest'

import {
  InvalidCreatorPageResponseError,
  creatorIdSchema,
  parseCreatorPosts,
  parseCreatorProfile,
  parseCreatorTiers,
} from './creator-page'

const envelope = (data: unknown) => ({ data, errors: null })

// BE-LAND-03 shapes — keep in step with back-end/docs/modules/landing/api.md.
const profile = {
  id: 4,
  alias: 'dana',
  avatar: 'https://cdn.fellowa.test/a.png',
  header: 'avatars/4/h.png',
  about: {
    bio: 'Painter',
    videoUrl: null,
    facebookLink: 'javascript:alert(1)',
    instagramLink: 'https://instagram.com/dana',
    twitterLink: null,
    youtubeLink: 'https://youtube.com/@dana',
  },
  categoryId: 2,
  numFollowers: '12',
}

describe('creator page responses (FE-PAGE-01)', () => {
  it('maps the profile and keeps only absolute http(s) links and images', () => {
    expect(parseCreatorProfile(envelope(profile))).toEqual({
      id: 4,
      alias: 'dana',
      avatarUrl: 'https://cdn.fellowa.test/a.png',
      coverUrl: null,
      bio: 'Painter',
      categoryId: 2,
      followerCount: 12,
      links: [
        { kind: 'instagram', url: 'https://instagram.com/dana' },
        { kind: 'youtube', url: 'https://youtube.com/@dana' },
      ],
    })
  })

  it('accepts a profile without an about record', () => {
    expect(
      parseCreatorProfile(envelope({ ...profile, about: null }))
    ).toMatchObject({ bio: null, links: [] })
  })

  it('parses tier prices as integer Toman and refuses anything else', () => {
    const tier = {
      id: 7,
      title: 'Supporter',
      description: null,
      price: '50000',
      cover: null,
      benefits: [{ id: 2, title: 'Early posts' }],
    }
    expect(parseCreatorTiers(envelope([tier]))).toEqual([
      {
        id: 7,
        title: 'Supporter',
        description: null,
        priceToman: 50000,
        coverUrl: null,
        benefits: [{ id: 2, title: 'Early posts' }],
      },
    ])
    for (const price of ['50000.5', '-1', 'free']) {
      expect(() => parseCreatorTiers(envelope([{ ...tier, price }]))).toThrow(
        InvalidCreatorPageResponseError
      )
    }
  })

  it('accepts only FULL posts', () => {
    const post = {
      id: 9,
      type: 'text',
      title: 'Hello',
      text: null,
      tags: null,
      createdAt: '2026-10-30T10:00:00.000Z',
      access: 'FULL',
    }
    expect(parseCreatorPosts(envelope([post]))).toEqual([
      {
        id: 9,
        title: 'Hello',
        text: null,
        tags: [],
        createdAt: '2026-10-30T10:00:00.000Z',
      },
    ])
    expect(() =>
      parseCreatorPosts(envelope([{ ...post, access: 'TEASER' }]))
    ).toThrow(InvalidCreatorPageResponseError)
  })

  it.each([
    ['12', true],
    ['0', false],
    ['-3', false],
    ['1.5', false],
    ['abc', false],
  ])('creator id %j valid: %j', (raw, ok) => {
    expect(creatorIdSchema.safeParse(raw).success).toBe(ok)
  })
})
