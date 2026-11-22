import { describe, expect, it, vi } from 'vitest'

import { appNav, panelPageForPath } from '@/components/layout/app-nav'
import en from '../../../messages/en.json'
import fa from '../../../messages/fa.json'

// The link module imports next-intl navigation, which needs Next's router at
// import time; only the pure helper is under test here.
vi.mock('@/i18n/navigation', () => ({
  Link: () => null,
  usePathname: () => '/',
}))
const { isPathActive } = await import('@/components/layout/nav-link')

describe('isPathActive', () => {
  it('matches the dashboard only exactly', () => {
    expect(isPathActive('/dashboard', '/dashboard', true)).toBe(true)
    expect(isPathActive('/dashboard', '/posts', true)).toBe(false)
  })

  it('keeps a section active on its sub-routes but not on look-alike paths', () => {
    expect(isPathActive('/posts', '/posts')).toBe(true)
    expect(isPathActive('/posts', '/posts/new')).toBe(true)
    expect(isPathActive('/posts', '/dashboard/postsx')).toBe(false)
  })
})

describe('creator navigation', () => {
  const items = appNav.flatMap((group) => group.items)

  it('has a label in both locales for every entry and group', () => {
    for (const item of items) {
      expect(fa.panel.nav).toHaveProperty(item.label)
      expect(en.panel.nav).toHaveProperty(item.label)
    }
    for (const { group } of appNav) {
      if (group) {
        expect(fa.panel.groups).toHaveProperty(group)
        expect(en.panel.groups).toHaveProperty(group)
      }
    }
  })

  it('never lists the same route twice', () => {
    const hrefs = items.map((item) => item.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('leaves the own-page address to the session (FE-SHELL-05)', () => {
    expect(items.find((item) => item.label === 'page')?.href).toBeNull()
  })

  it('has no /studio route (FE-SHELL-05)', () => {
    for (const { href } of items) expect(href ?? '').not.toMatch(/studio/i)
  })
})

describe('panelPageForPath', () => {
  it('names the page each creator route shows, most specific first', () => {
    expect(panelPageForPath('/dashboard')).toBe('dashboard')
    expect(panelPageForPath('/posts/new')).toBe('composer')
    expect(panelPageForPath('/posts')).toBe('posts')
    expect(panelPageForPath('/posts/12')).toBe('posts')
    expect(panelPageForPath('/memberships')).toBe('payments')
    expect(panelPageForPath('/chats')).toBe('chats')
  })

  it('returns null outside the known routes', () => {
    expect(panelPageForPath('/dashboard/unknown')).toBeNull()
    expect(panelPageForPath('/chatsx')).toBeNull()
  })

  it('has a header title and category in both locales for every page', () => {
    for (const path of [
      '/dashboard',
      '/posts',
      '/posts/new',
      '/tiers',
      '/audience',
      '/payouts',
      '/memberships',
      '/settings',
      '/explore',
      '/feed',
      '/chats',
      '/notifications',
    ]) {
      const page = panelPageForPath(path)
      expect(page).not.toBeNull()
      expect(fa.panel.pages).toHaveProperty(`${page}.title`)
      expect(en.panel.pages).toHaveProperty(`${page}.title`)
      if (page !== 'dashboard') {
        expect(fa.panel.pages).toHaveProperty(`${page}.category`)
        expect(en.panel.pages).toHaveProperty(`${page}.category`)
      }
    }
  })
})

describe('re-ported labels (presentation d843c3b)', () => {
  it("uses the design's Persian navigation labels", () => {
    expect(fa.panel.nav.tiers).toBe('پلن‌ها')
    expect(fa.panel.nav.explore).toBe('کاوش')
    expect(fa.panel.nav.feed).toBe('تازه‌ها')
    expect(fa.panel.nav.chats).toBe('گفتگوها')
  })
})
