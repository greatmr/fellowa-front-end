import Image from 'next/image'

import { cn } from '@/lib/utils'

import type { landingImages } from './landing-images'

type LandingImage = (typeof landingImages)[keyof typeof landingImages]

/** Overlapping decorative avatars in a mock-up (presentation `.fw-chip-avatars`). */
export function AvatarStack({
  images,
  className,
}: {
  images: LandingImage[]
  /** Size of each avatar, e.g. `size-6`. */
  className: string
}) {
  return (
    <span className="flex shrink-0" aria-hidden>
      {images.map((image, index) => (
        <Image
          key={image.src + index}
          {...image}
          alt=""
          sizes="1.75rem"
          className={cn(
            'rounded-full border-2 border-card object-cover not-first:-ms-2',
            className
          )}
        />
      ))}
    </span>
  )
}
