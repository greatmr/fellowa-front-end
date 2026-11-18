import { describe, expect, it, vi } from 'vitest'

import { studioNav, studioPageForPath } from '@/components/layout/studio-nav'
import en from '../../../messages/en.json'
import fa from '../../../messages/fa.json'

// The link module imports next-intl navigation, which needs Next's router at
// import time; only the pure helper is under test here.
vi.mock('@/i18n/navigation', () => ({
  Link: () => null,
  usePathname: () => '/',
}))
const { isPathActive } = await import('@/components/layout/studio-nav-link')

describe('isPathActive', () => {
  it('matches the studio root only exactly', () => {
    expect(isPathActive('/studio', '/studio', true)).toBe(true)
    expect(isPathActive('/studio', '/studio/posts', true)).toBe(false)
  })

  it('keeps a section active on its sub-routes but not on look-alike paths', () => {
    expect(isPathActive('/studio/posts', '/studio/posts')).toBe(true)
    expect(isPathActive('/studio/posts', '/studio/posts/new')).toBe(true)
    expect(isPathActive('/studio/posts', '/studio/postsx')).toBe(false)
    expect(isPathActive('/studio/page', '/studio/payouts')).toBe(false)
  })
})

describe('studio navigation', () => {
  const items = studioNav.flatMap((group) => group.items)

  it('has a label in both locales for every entry and group', () => {
    for (const item of items) {
      expect(fa.studio.nav).toHaveProperty(item.label)
      expect(en.studio.nav).toHaveProperty(item.label)
    }
    for (const { group } of studioNav) {
      if (group) {
        expect(fa.studio.groups).toHaveProperty(group)
        expect(en.studio.groups).toHaveProperty(group)
      }
    }
  })

  it('never lists the same route twice', () => {
    const hrefs = items.map((item) => item.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})

describe('studioPageForPath', () => {
  it('names the page each studio route shows, most specific first', () => {
    expect(studioPageForPath('/studio')).toBe('dashboard')
    expect(studioPageForPath('/studio/posts/new')).toBe('composer')
    expect(studioPageForPath('/studio/posts')).toBe('posts')
    expect(studioPageForPath('/studio/posts/12')).toBe('posts')
    expect(studioPageForPath('/memberships')).toBe('payments')
    expect(studioPageForPath('/chats')).toBe('chats')
  })

  it('returns null outside the known routes', () => {
    expect(studioPageForPath('/studio/unknown')).toBeNull()
    expect(studioPageForPath('/chatsx')).toBeNull()
  })

  it('has a header title and category in both locales for every page', () => {
    for (const path of [
      '/studio',
      '/studio/page',
      '/studio/posts',
      '/studio/posts/new',
      '/studio/tiers',
      '/studio/audience',
      '/studio/payouts',
      '/memberships',
      '/settings',
      '/explore',
      '/feed',
      '/chats',
      '/notifications',
    ]) {
      const page = studioPageForPath(path)
      expect(page).not.toBeNull()
      expect(fa.studio.pages).toHaveProperty(`${page}.title`)
      expect(en.studio.pages).toHaveProperty(`${page}.category`)
    }
  })
})

describe('re-ported labels (presentation d843c3b)', () => {
  it("uses the design's Persian navigation labels", () => {
    expect(fa.studio.nav.tiers).toBe('پلن‌ها')
    expect(fa.studio.nav.explore).toBe('کاوش')
    expect(fa.studio.nav.feed).toBe('تازه‌ها')
    expect(fa.studio.nav.chats).toBe('گفتگوها')
  })
})
