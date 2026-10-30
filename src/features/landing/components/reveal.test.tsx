import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Reveal } from './reveal'

let notify: IntersectionObserverCallback | null = null

function stubObserver() {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback
      }
      observe() {}
      disconnect() {}
    }
  )
}

function placeBelowFold() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    top: window.innerHeight + 500,
  } as DOMRect)
}

function reducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
  } as MediaQueryList)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  notify = null
})

function revealWrapper() {
  return screen.getByText('content').parentElement
}

describe('Reveal', () => {
  it('hides content below the fold until it scrolls into view', () => {
    stubObserver()
    placeBelowFold()
    reducedMotion(false)
    render(
      <Reveal>
        <p>content</p>
      </Reveal>
    )
    expect(revealWrapper()).toHaveAttribute('data-reveal', 'hidden')

    act(() => {
      notify?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })
    expect(revealWrapper()).toHaveAttribute('data-reveal', 'shown')
  })

  it('never hides content already in view', () => {
    stubObserver()
    reducedMotion(false)
    render(
      <Reveal>
        <p>content</p>
      </Reveal>
    )
    expect(revealWrapper()).not.toHaveAttribute('data-reveal')
  })

  it('never hides content under reduced motion', () => {
    stubObserver()
    placeBelowFold()
    reducedMotion(true)
    render(
      <Reveal>
        <p>content</p>
      </Reveal>
    )
    expect(revealWrapper()).not.toHaveAttribute('data-reveal')
  })
})
