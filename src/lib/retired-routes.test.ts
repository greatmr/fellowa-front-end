import { describe, expect, it } from 'vitest'

import { currentPanelPath, retiredPanelRedirects } from './retired-routes'

describe('retiredPanelRedirects (FE-SHELL-05)', () => {
  const rules = retiredPanelRedirects()

  it.each([
    ['/studio', '/dashboard'],
    ['/studio/page', '/dashboard'],
    ['/studio/posts', '/posts'],
    ['/studio/posts/new', '/posts/new'],
    ['/studio/posts/:postId/edit', '/posts/:postId/edit'],
    ['/studio/tiers', '/tiers'],
    ['/studio/audience', '/audience'],
    ['/studio/payouts', '/payouts'],
  ])('sends %s to %s permanently, in both locale forms', (source, to) => {
    expect(rules).toContainEqual({ source, destination: to, permanent: true })
    expect(rules).toContainEqual({
      source: `/:locale(fa|en)${source}`,
      destination: `/:locale${to}`,
      permanent: true,
    })
  })

  it('redirects only from the old prefix, never to it', () => {
    for (const rule of rules) {
      expect(rule.source).toMatch(/^(\/:locale\(fa\|en\))?\/studio(\/|$)/)
      expect(rule.destination).not.toMatch(/studio/)
      expect(rule.permanent).toBe(true)
    }
  })
})

describe('currentPanelPath', () => {
  it('maps a retired static path and nothing else', () => {
    expect(currentPanelPath('/studio/tiers')).toBe('/tiers')
    expect(currentPanelPath('/studio/posts/:postId/edit')).toBeUndefined()
    expect(currentPanelPath('/tiers')).toBeUndefined()
  })
})
