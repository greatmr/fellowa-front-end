import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithIntl } from '../../../test/render'
import { PostMediaPlayer } from './post-media-player'

const SRC = 'http://localhost:9000/fellowa/content/video/1-a.mov'

describe('PostMediaPlayer (BE-CONT-16)', () => {
  it('names a player without a title by its kind', () => {
    renderWithIntl(<PostMediaPlayer kind="audio" src={SRC} title="  " />, {
      locale: 'en',
      strict: true,
    })

    const audio = screen.getByLabelText('Audio')
    expect(audio.tagName).toBe('AUDIO')
    expect(audio).toHaveAttribute('controls')
    expect(audio).not.toHaveAttribute('autoplay')
  })

  it('plays inline, and falls back to a link that opens the file in a new tab', () => {
    renderWithIntl(<PostMediaPlayer kind="video" src={SRC} title="Clip" />, {
      locale: 'en',
      strict: true,
    })

    const video = screen.getByLabelText('Video: Clip')
    expect(video).toHaveAttribute('playsinline')
    fireEvent.error(video)

    expect(screen.getByRole('status')).toHaveTextContent(
      "This file can't be played in your browser."
    )
    const link = screen.getByRole('link', { name: 'Open or download the file' })
    expect(link).toHaveAttribute('href', SRC)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('tries again when the source changes', () => {
    const { rerender } = renderWithIntl(
      <PostMediaPlayer kind="video" src={SRC} />,
      { locale: 'en', strict: true }
    )
    fireEvent.error(screen.getByLabelText('Video'))
    expect(screen.queryByLabelText('Video')).toBeNull()

    rerender(<PostMediaPlayer kind="video" src={`${SRC}?v=2`} />)
    expect(screen.getByLabelText('Video')).toHaveAttribute('src', `${SRC}?v=2`)
  })

  describe('an error before hydration', () => {
    // jsdom never sets `error`; stand in for a browser that already failed.
    const proto = HTMLMediaElement.prototype
    const original = Object.getOwnPropertyDescriptor(proto, 'error')

    afterEach(() => {
      if (original) Object.defineProperty(proto, 'error', original)
      else Reflect.deleteProperty(proto, 'error')
    })

    it('reads the element’s error back and shows the fallback', () => {
      Object.defineProperty(proto, 'error', {
        configurable: true,
        get: () => ({ code: 4 }),
      })
      renderWithIntl(<PostMediaPlayer kind="video" src={SRC} />, {
        locale: 'en',
        strict: true,
      })

      expect(screen.queryByLabelText('Video')).toBeNull()
      expect(
        screen.getByRole('link', { name: 'Open or download the file' })
      ).toHaveAttribute('href', SRC)
    })
  })
})
