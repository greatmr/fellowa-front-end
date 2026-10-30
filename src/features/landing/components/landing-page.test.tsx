import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { renderWithIntl } from '../../../../test/render'
import { LandingPage } from './landing-page'

function keysOf(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, prefix ? `${prefix}.${key}` : key)
  )
}

function headingNames(level: number) {
  return screen
    .getAllByRole('heading', { level })
    .map((heading) => heading.textContent)
}

describe('LandingPage', () => {
  it.each([
    ['fa', fa.landing],
    ['en', en.landing],
  ] as const)('renders every section heading in %s', (locale, copy) => {
    renderWithIntl(<LandingPage />, { locale })

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBeTruthy()
    expect(headingNames(2)).toEqual([
      copy.features.support.title,
      copy.features.tiers.title,
      copy.features.content.title,
      copy.features.chat.title,
      copy.compare.title,
      copy.trust.title,
      copy.finalCta.title,
    ])
    expect(headingNames(3)).toEqual([
      copy.trust.control.title,
      copy.trust.receipt.title,
      copy.trust.benefits.title,
      copy.trust.iran.title,
    ])
  })

  it.each([
    ['fa', fa.landing, ''],
    ['en', en.landing, '/en'],
  ] as const)(
    'points each %s call to action at its route',
    (locale, copy, prefix) => {
      renderWithIntl(<LandingPage />, { locale })

      expect(screen.getByRole('link', { name: copy.hero.cta })).toHaveAttribute(
        'href',
        `${prefix}/auth/register`
      )
      expect(
        screen.getByRole('link', { name: copy.finalCta.cta })
      ).toHaveAttribute('href', `${prefix}/auth/register`)
      expect(
        screen.getByRole('link', {
          name: locale === 'fa' ? 'وارد شو' : 'Log in',
        })
      ).toHaveAttribute('href', `${prefix}/auth/login`)

      const browseLinks = [
        screen.getByRole('link', { name: copy.features.support.action }),
        ...screen.getAllByRole('link', { name: copy.sample.join }),
      ]
      expect(browseLinks).toHaveLength(6)
      for (const link of browseLinks) {
        expect(link).toHaveAttribute('href', `${prefix}/creators`)
      }
    }
  )

  it('anchors the sections the public header links to', () => {
    const { container } = renderWithIntl(<LandingPage />)

    expect(container.querySelector('#features')).toBeInTheDocument()
    expect(container.querySelector('#why')).toBeInTheDocument()
  })

  it('labels every product mock-up as an illustration', () => {
    renderWithIntl(<LandingPage />)

    expect(screen.getAllByRole('figure')).toHaveLength(5)
    expect(screen.getAllByText(fa.landing.sample.label)).toHaveLength(5)
  })

  it('gives decorative images an empty alt and loads them locally', () => {
    const { container } = renderWithIntl(<LandingPage />)
    const images = Array.from(container.querySelectorAll('img'))

    expect(images.length).toBeGreaterThan(0)
    for (const image of images) {
      expect(image).toHaveAttribute('alt', '')
      expect(image.getAttribute('src')).toMatch(
        /^\/_next\/image\?url=%2Flanding%2F/
      )
    }
  })
})

describe('landing copy', () => {
  it('has the same keys in both locales', () => {
    expect(keysOf(en.landing).sort()).toEqual(keysOf(fa.landing).sort())
  })

  it.each([
    ['commission', 'کارمزد'],
    ['no intermediary in payment', 'بدون واسطه'],
    ['no algorithm', 'الگوریتم'],
    ['first platform', 'اولین پلتفرم'],
    ['time to build', 'یک دقیقه'],
    ['free to build', 'رایگان'],
    ['group chat', 'گروه گفتگو'],
    ['live streaming', 'پخش زنده'],
    ['most popular', 'محبوب‌ترین'],
    ['rial payment', 'ریالی'],
    ['reporting and support', 'پشتیبانی'],
    ['predictable income', 'قابل‌پیش‌بینی'],
    ['growth figure', '٪'],
  ])('does not bring back the removed claim: %s', (_claim, text) => {
    expect(JSON.stringify(fa.landing)).not.toContain(text)
  })
})
