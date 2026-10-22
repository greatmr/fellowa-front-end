import { createRef } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// jsdom does not fetch/decode images. Control only that browser boundary; the
// real Radix loading state, effects, and fallback behavior remain under test.
const images: BrowserImage[] = []

class BrowserImage extends EventTarget {
  src = ''
  complete = false
  naturalWidth = 0
  crossOrigin: string | null = null
  referrerPolicy = ''

  constructor() {
    super()
    images.push(this)
  }

  finish(success: boolean) {
    this.complete = true
    this.naturalWidth = success ? 80 : 0
    this.dispatchEvent(new Event(success ? 'load' : 'error'))
  }
}

function latestImage() {
  const image = images.at(-1)
  if (!image) throw new Error('Expected an image request')
  return image
}

describe('Avatar', () => {
  beforeEach(() => {
    images.length = 0
    vi.stubGlobal('Image', BrowserImage)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('shows an accessible fallback when no image source is available', () => {
    const ref = createRef<HTMLSpanElement>()
    const fallbackRef = createRef<HTMLSpanElement>()
    render(
      <Avatar ref={ref} role="img" aria-label="Sara profile">
        <AvatarImage alt="Sara" />
        <AvatarFallback ref={fallbackRef}>SA</AvatarFallback>
      </Avatar>
    )

    expect(ref.current).toBe(screen.getByRole('img', { name: 'Sara profile' }))
    expect(fallbackRef.current).toBe(screen.getByText('SA'))
    expect(screen.queryByRole('img', { name: 'Sara' })).not.toBeInTheDocument()
  })

  it('replaces the fallback only after load and preserves image attributes and ref', () => {
    const ref = createRef<HTMLImageElement>()
    render(
      <Avatar>
        <AvatarImage
          ref={ref}
          src="/sara.png"
          alt="Sara portrait"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <AvatarFallback>SA</AvatarFallback>
      </Avatar>
    )

    expect(screen.getByText('SA')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    act(() => latestImage().finish(true))
    const image = screen.getByRole('img', { name: 'Sara portrait' })
    expect(image).toHaveAttribute('src', '/sara.png')
    expect(image).toHaveAttribute('crossorigin', 'anonymous')
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(ref.current).toBe(image)
    expect(screen.queryByText('SA')).not.toBeInTheDocument()
  })

  it('retains fallback after an error and recovers when a new source loads', () => {
    function Portrait({ src }: { src: string }) {
      return (
        <Avatar>
          <AvatarImage src={src} alt="Sara portrait" />
          <AvatarFallback>SA</AvatarFallback>
        </Avatar>
      )
    }

    const { rerender } = render(<Portrait src="/missing.png" />)
    const failedImage = latestImage()
    act(() => failedImage.finish(false))
    expect(screen.getByText('SA')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    rerender(<Portrait src="/replacement.png" />)
    // A stale request cannot replace the fallback for the new source.
    act(() => failedImage.finish(true))
    expect(screen.getByText('SA')).toBeInTheDocument()
    act(() => latestImage().finish(true))
    expect(screen.getByRole('img', { name: 'Sara portrait' })).toHaveAttribute(
      'src',
      '/replacement.png'
    )
    expect(screen.queryByText('SA')).not.toBeInTheDocument()
  })

  it('delays the fallback until its requested delay has elapsed', () => {
    vi.useFakeTimers()
    const { unmount } = render(
      <Avatar>
        <AvatarImage src="/slow.png" alt="Sara portrait" />
        <AvatarFallback delayMs={200}>SA</AvatarFallback>
      </Avatar>
    )

    expect(screen.queryByText('SA')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(199))
    expect(screen.queryByText('SA')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('SA')).toBeInTheDocument()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels a pending fallback timer when unmounted before the delay', () => {
    vi.useFakeTimers()
    const { unmount } = render(
      <Avatar>
        <AvatarImage src="/slow.png" alt="Sara portrait" />
        <AvatarFallback delayMs={200}>SA</AvatarFallback>
      </Avatar>
    )

    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    act(() => vi.advanceTimersByTime(200))
    expect(screen.queryByText('SA')).not.toBeInTheDocument()
  })
})
