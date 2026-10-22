import { notFound } from 'next/navigation'

/**
 * Unmatched paths inside a locale would otherwise get Next's default English
 * 404, outside the locale layout. Routing them here renders
 * `[locale]/not-found.tsx` with the right language and direction.
 */
export default function CatchAllNotFound() {
  notFound()
}
