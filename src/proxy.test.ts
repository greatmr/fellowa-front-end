// @vitest-environment node
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { routing } from '@/i18n/routing'

import proxy, { withoutBrowserLanguage } from './proxy'

const ORIGIN = 'http://localhost:4000'

function request(
  path: string,
  { cookie, language }: { cookie?: string; language?: string } = {}
) {
  const headers = new Headers({ 'sec-fetch-dest': 'document' })
  if (cookie) headers.set('cookie', cookie)
  if (language) headers.set('accept-language', language)
  return new NextRequest(`${ORIGIN}${path}`, { headers })
}

/** The internal path the proxy rewrote to, or null when it did not. */
function rewrittenTo(response: Response) {
  const target = response.headers.get('x-middleware-rewrite')
  return target ? new URL(target).pathname + new URL(target).search : null
}

function localeCookie(response: Response) {
  const header = response.headers.get('set-cookie') ?? ''
  const value = /NEXT_LOCALE=(\w+)/.exec(header)?.[1] ?? null
  if (value) {
    // Site-wide and lasting: a path-scoped or session cookie would lose the
    // choice on other pages or the next visit.
    expect(header).toMatch(/Path=\/(;|$)/)
    expect(header).toMatch(/Max-Age=31536000/)
  }
  return value
}

describe('routing (FE-I18N-01)', () => {
  it('serves Persian by default and never shows a locale in the URL', () => {
    expect(routing.defaultLocale).toBe('fa')
    expect(routing.localePrefix).toBe('never')
  })

  it('remembers the chosen language for a year', () => {
    expect(routing.localeCookie).toMatchObject({ maxAge: 60 * 60 * 24 * 365 })
  })
})

describe('proxy (FE-I18N-01)', () => {
  it('serves a bare path in Persian', () => {
    const response = proxy(request('/creators'))

    expect(response.status).toBe(200)
    expect(rewrittenTo(response)).toBe('/fa/creators')
  })

  it('ignores a browser that asks for English', () => {
    const response = proxy(request('/creators', { language: 'en-US,en;q=0.9' }))

    expect(rewrittenTo(response)).toBe('/fa/creators')
    // next-intl records the resolved language for a new visitor.
    expect(localeCookie(response)).toBe('fa')
  })

  it('serves English once the switcher stored it in the cookie', () => {
    const response = proxy(
      request('/creators?q=sara', { cookie: 'NEXT_LOCALE=en', language: 'fa' })
    )

    expect(rewrittenTo(response)).toBe('/en/creators?q=sara')
  })

  it('falls back to Persian for an unknown cookie value', () => {
    const response = proxy(request('/', { cookie: 'NEXT_LOCALE=de' }))

    expect(rewrittenTo(response)).toBe('/fa')
  })

  it.each([
    ['/en/creators/7?q=a&b=1', '/creators/7?q=a&b=1', 'en'],
    ['/en', '/', 'en'],
    ['/fa/auth?returnTo=%2Fstudio', '/auth?returnTo=%2Fstudio', 'fa'],
  ])(
    'redirects the old prefixed %s to %s and keeps its language',
    (from, to, cookie) => {
      const response = proxy(request(from))

      expect(response.status).toBe(307)
      const location = new URL(response.headers.get('location') ?? '')
      expect(location.pathname + location.search).toBe(to)
      expect(localeCookie(response)).toBe(cookie)
    }
  )

  it('switches an English visitor back to Persian through an old /fa link', () => {
    const response = proxy(request('/fa/studio', { cookie: 'NEXT_LOCALE=en' }))

    expect(response.status).toBe(307)
    expect(localeCookie(response)).toBe('fa')
  })
})

describe('withoutBrowserLanguage', () => {
  it('drops Accept-Language and keeps the cookie, method and URL', () => {
    const original = new NextRequest(`${ORIGIN}/auth?x=1`, {
      method: 'POST',
      headers: { 'accept-language': 'en', cookie: 'NEXT_LOCALE=en' },
      body: 'payload',
    })

    const copy = withoutBrowserLanguage(original)

    expect(copy.headers.has('accept-language')).toBe(false)
    expect(copy.cookies.get('NEXT_LOCALE')?.value).toBe('en')
    expect(copy.method).toBe('POST')
    expect(copy.url).toBe(original.url)
    // The body is left with the original request.
    expect(original.bodyUsed).toBe(false)
  })

  it('returns the request itself when there is no Accept-Language', () => {
    const original = request('/')

    expect(withoutBrowserLanguage(original)).toBe(original)
  })
})
