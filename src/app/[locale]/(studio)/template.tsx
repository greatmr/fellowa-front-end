import type { ReactNode } from 'react'

/**
 * A template remounts on every studio navigation, so each page enters with
 * the presentation's `page-enter` (fade and 8px rise, 240ms; App.tsx view
 * change @ d843c3b). The global reduced-motion rule makes it instant.
 * No `forwards` fill: a transform kept after the animation would make this
 * wrapper the containing block of any `position: fixed` element in a page.
 */
export default function StudioTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="animate-page-enter [animation-fill-mode:backwards]">
      {children}
    </div>
  )
}
