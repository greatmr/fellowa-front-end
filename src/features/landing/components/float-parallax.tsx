'use client'

import { useEffect } from 'react'

/** Per-chip scroll speed, cycled (presentation `LandingView` parallax). */
const SPEEDS = [0.055, -0.045, 0.07, -0.06, 0.05]

/**
 * Nudges every `[data-parallax]` chip by a few pixels as the page scrolls,
 * through the `--py` offset the `chip-float` keyframe reads. Renders nothing; does
 * nothing under prefers-reduced-motion.
 */
export function FloatParallax() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const chips = Array.from(
      document.querySelectorAll<HTMLElement>('[data-parallax]')
    )
    let frame: number | null = null
    const update = () => {
      frame = null
      const middle = window.innerHeight / 2
      chips.forEach((chip, index) => {
        const rect = chip.getBoundingClientRect()
        if (rect.width === 0) return
        const offset = rect.top + rect.height / 2 - middle
        const speed = SPEEDS[index % SPEEDS.length] ?? 0
        chip.style.setProperty('--py', `${(offset * speed).toFixed(1)}px`)
      })
    }
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [])

  return null
}
