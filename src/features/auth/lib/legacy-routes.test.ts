import { describe, expect, it } from 'vitest'

import { legacyAuthRedirects } from './legacy-routes'

describe('legacyAuthRedirects', () => {
  it('sends the retired routes on, temporarily, in both locales', () => {
    expect(legacyAuthRedirects()).toEqual([
      { source: '/auth/login', destination: '/auth', permanent: false },
      {
        source: '/:locale(fa|en)/auth/login',
        destination: '/:locale/auth',
        permanent: false,
      },
      { source: '/auth/register', destination: '/auth', permanent: false },
      {
        source: '/:locale(fa|en)/auth/register',
        destination: '/:locale/auth',
        permanent: false,
      },
      // FE-ONB-02 (FQ-20): the old onboarding opens the address step.
      { source: '/onboarding', destination: '/auth/url', permanent: false },
      {
        source: '/:locale(fa|en)/onboarding',
        destination: '/:locale/auth/url',
        permanent: false,
      },
    ])
  })

  it('leaves the email screens and recovery alone, and adds no query rule', () => {
    for (const rule of legacyAuthRedirects()) {
      // Next.js passes the query (returnTo, reason) through unless told not to.
      expect(Object.keys(rule).sort()).toEqual([
        'destination',
        'permanent',
        'source',
      ])
      expect(rule.source).not.toMatch(/email|:path|\*/)
    }
  })
})
